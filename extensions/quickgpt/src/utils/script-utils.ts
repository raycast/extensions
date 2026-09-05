import fs from "fs";
import path from "path";
import md5 from "md5";
import { startupElapsedMs, startupLog, startupNowMs } from "./startup-profiler";
import { createNamespacedCache } from "./extension-cache";

export interface ScriptInfo {
  path: string;
  name: string;
}

interface GetAvailableScriptsOptions {
  preferCache?: boolean;
  forceRefresh?: boolean;
}

interface ScriptDirectoryScanResult {
  scripts: ScriptInfo[];
  complete: boolean;
}

const CACHE_KEY_DIRECTORIES = "scripts_directories_v1";
const CACHE_KEY_DATA = "scripts_data_v1";
const scriptCache = createNamespacedCache("scripts-v1", [CACHE_KEY_DIRECTORIES, CACHE_KEY_DATA]);
let memoryCache: { directoryKey: string; scripts: ScriptInfo[] } | undefined;
const pendingScriptRefreshes = new Map<string, Promise<ScriptInfo[]>>();

function normalizeScriptDirectories(scriptsDirectories: (string | undefined)[]): string[] {
  return scriptsDirectories.filter((dir): dir is string => typeof dir === "string" && dir.trim() !== "");
}

function getDirectoryKey(scriptsDirectories: string[]): string {
  return JSON.stringify(scriptsDirectories);
}

function readCachedScripts(directoryKey: string): ScriptInfo[] | undefined {
  if (memoryCache?.directoryKey === directoryKey) {
    startupLog("Scripts memory cache hit", { scriptCount: memoryCache.scripts.length });
    return memoryCache.scripts;
  }

  const cachedDirectoryKey = scriptCache.get(CACHE_KEY_DIRECTORIES);
  const cachedData = scriptCache.get(CACHE_KEY_DATA);

  if (cachedDirectoryKey !== directoryKey || !cachedData) {
    startupLog("Scripts persistent cache miss", {
      directoryKeyHash: md5(directoryKey),
      cachedDirectoryKeyHash: cachedDirectoryKey ? md5(cachedDirectoryKey) : "",
      hasCachedData: !!cachedData,
    });
    return undefined;
  }

  try {
    const parsed = JSON.parse(cachedData);
    if (!Array.isArray(parsed)) {
      return undefined;
    }

    const scripts = parsed.filter(
      (script): script is ScriptInfo =>
        script && typeof script === "object" && typeof script.path === "string" && typeof script.name === "string",
    );
    memoryCache = { directoryKey, scripts };
    startupLog("Scripts cache hydrated", { scriptCount: scripts.length });
    return scripts;
  } catch {
    scriptCache.remove(CACHE_KEY_DIRECTORIES);
    scriptCache.remove(CACHE_KEY_DATA);
    return undefined;
  }
}

function writeCachedScripts(directoryKey: string, scripts: ScriptInfo[]): void {
  memoryCache = { directoryKey, scripts };
  scriptCache.set(CACHE_KEY_DIRECTORIES, directoryKey);
  scriptCache.set(CACHE_KEY_DATA, JSON.stringify(scripts));
  startupLog("Scripts cache stored", {
    directoryKeyHash: md5(directoryKey),
    scriptCount: scripts.length,
  });
}

export function scanScriptsDirectory(dir: string, relativePath = "", result: ScriptInfo[] = []): ScriptInfo[] {
  return scanScriptsDirectoryWithStatus(dir, relativePath, result).scripts;
}

function scanScriptsDirectoryWithStatus(
  dir: string,
  relativePath = "",
  result: ScriptInfo[] = [],
): ScriptDirectoryScanResult {
  let complete = true;

  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      if (item.name.startsWith("#")) continue;

      const itemPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        const nestedScan = scanScriptsDirectoryWithStatus(itemPath, path.join(relativePath, item.name), result);
        complete = complete && nestedScan.complete;
      } else if (item.isFile() && (item.name.endsWith(".applescript") || item.name.endsWith(".scpt"))) {
        const displayName = path.basename(item.name, path.extname(item.name));

        result.push({
          path: itemPath,
          name: displayName,
        });
      }
    }

    return { scripts: result, complete };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { scripts: result, complete };
    }
    console.error(`Failed to scan scripts directory ${dir}:`, error);
    return { scripts: result, complete: false };
  }
}

export async function scanScriptsDirectoryAsync(
  dir: string,
  relativePath = "",
  result: ScriptInfo[] = [],
): Promise<ScriptInfo[]> {
  return (await scanScriptsDirectoryAsyncWithStatus(dir, relativePath, result)).scripts;
}

async function scanScriptsDirectoryAsyncWithStatus(
  dir: string,
  relativePath = "",
  result: ScriptInfo[] = [],
): Promise<ScriptDirectoryScanResult> {
  let complete = true;

  try {
    const items = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      if (item.name.startsWith("#")) continue;

      const itemPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        const nestedScan = await scanScriptsDirectoryAsyncWithStatus(
          itemPath,
          path.join(relativePath, item.name),
          result,
        );
        complete = complete && nestedScan.complete;
      } else if (item.isFile() && (item.name.endsWith(".applescript") || item.name.endsWith(".scpt"))) {
        result.push({
          path: itemPath,
          name: path.basename(item.name, path.extname(item.name)),
        });
      }
    }

    return { scripts: result, complete };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { scripts: result, complete };
    }
    console.error(`Failed to scan scripts directory ${dir}:`, error);
    return { scripts: result, complete: false };
  }
}

export function getAvailableScripts(
  scriptsDirectories: (string | undefined)[],
  options: GetAvailableScriptsOptions = {},
): ScriptInfo[] {
  const started = startupNowMs();
  const directories = normalizeScriptDirectories(scriptsDirectories);
  const directoryKey = getDirectoryKey(directories);
  let cachedScripts: ScriptInfo[] | undefined;

  if (!options.forceRefresh) {
    cachedScripts = readCachedScripts(directoryKey);
    if (cachedScripts !== undefined) {
      startupLog("Scripts returned from cache", {
        durationMs: startupElapsedMs(started),
        directoryCount: directories.length,
        scriptCount: cachedScripts.length,
      });
      return cachedScripts;
    }

    if (options.preferCache) {
      startupLog("Scripts cache unavailable", {
        durationMs: startupElapsedMs(started),
        directoryCount: directories.length,
      });
      return [];
    }
  }

  const scripts: ScriptInfo[] = [];
  const scriptNames = new Set<string>();
  let scanComplete = true;

  for (const scriptsDirectory of directories) {
    const directoryScan = scanScriptsDirectoryWithStatus(scriptsDirectory);
    scanComplete = scanComplete && directoryScan.complete;
    directoryScan.scripts.forEach((script) => {
      if (!scriptNames.has(script.name)) {
        scripts.push(script);
        scriptNames.add(script.name);
      }
    });
  }

  if (!scanComplete) {
    cachedScripts ??= readCachedScripts(directoryKey);
    const fallbackScripts = cachedScripts ?? scripts;
    startupLog("Scripts scan incomplete", {
      durationMs: startupElapsedMs(started),
      directoryCount: directories.length,
      readableScriptCount: scripts.length,
      returnedScriptCount: fallbackScripts.length,
      usedCachedScripts: cachedScripts !== undefined,
      forced: options.forceRefresh === true,
    });
    return fallbackScripts;
  }

  writeCachedScripts(directoryKey, scripts);

  startupLog("Scripts scanned", {
    durationMs: startupElapsedMs(started),
    directoryCount: directories.length,
    scriptCount: scripts.length,
    forced: options.forceRefresh === true,
  });

  return scripts;
}

export async function getAvailableScriptsAsync(
  scriptsDirectories: (string | undefined)[],
  options: GetAvailableScriptsOptions = {},
): Promise<ScriptInfo[]> {
  const started = startupNowMs();
  const directories = normalizeScriptDirectories(scriptsDirectories);
  const directoryKey = getDirectoryKey(directories);
  let cachedScripts: ScriptInfo[] | undefined;

  if (!options.forceRefresh) {
    cachedScripts = readCachedScripts(directoryKey);
    if (cachedScripts !== undefined) {
      startupLog("Scripts returned from cache", {
        durationMs: startupElapsedMs(started),
        directoryCount: directories.length,
        scriptCount: cachedScripts.length,
      });
      return cachedScripts;
    }

    if (options.preferCache) {
      startupLog("Scripts cache unavailable", {
        durationMs: startupElapsedMs(started),
        directoryCount: directories.length,
      });
      return [];
    }
  }

  const scanAndCache = async () => {
    const scripts: ScriptInfo[] = [];
    const scriptNames = new Set<string>();
    let scanComplete = true;

    for (const scriptsDirectory of directories) {
      const directoryScan = await scanScriptsDirectoryAsyncWithStatus(scriptsDirectory);
      scanComplete = scanComplete && directoryScan.complete;
      for (const script of directoryScan.scripts) {
        if (!scriptNames.has(script.name)) {
          scripts.push(script);
          scriptNames.add(script.name);
        }
      }
    }

    if (!scanComplete) {
      cachedScripts ??= readCachedScripts(directoryKey);
      const fallbackScripts = cachedScripts ?? scripts;
      startupLog("Scripts scan incomplete asynchronously", {
        durationMs: startupElapsedMs(started),
        directoryCount: directories.length,
        readableScriptCount: scripts.length,
        returnedScriptCount: fallbackScripts.length,
        usedCachedScripts: cachedScripts !== undefined,
        forced: options.forceRefresh === true,
      });
      return fallbackScripts;
    }

    writeCachedScripts(directoryKey, scripts);
    startupLog("Scripts scanned asynchronously", {
      durationMs: startupElapsedMs(started),
      directoryCount: directories.length,
      scriptCount: scripts.length,
      forced: options.forceRefresh === true,
    });

    return scripts;
  };

  if (options.forceRefresh) {
    const pendingRefresh = pendingScriptRefreshes.get(directoryKey);
    if (pendingRefresh) {
      return pendingRefresh;
    }

    const refresh = scanAndCache().finally(() => {
      if (pendingScriptRefreshes.get(directoryKey) === refresh) {
        pendingScriptRefreshes.delete(directoryKey);
      }
    });
    pendingScriptRefreshes.set(directoryKey, refresh);
    return refresh;
  }

  return scanAndCache();
}
