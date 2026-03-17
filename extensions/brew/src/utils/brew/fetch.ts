/**
 * Homebrew data fetching utilities.
 *
 * Provides functions for fetching installed and outdated packages.
 *
 * Performance optimization: Uses a two-phase loading strategy:
 * 1. Fast initial load with `brew list --versions` (returns minimal data quickly)
 * 2. Background fetch with `brew info --json=v2 --installed` for full metadata
 */

import * as fs from "fs/promises";
import {
  Cask,
  Formula,
  InstallableResults,
  InstalledMap,
  OutdatedResults,
  DownloadProgressCallback,
  ChunkedRemote,
  CacheIndex,
  IndexEntry,
} from "../types";
import {
  cachePath,
  downloadRemoteToCache,
  getChunkedCacheConfig,
  isChunkedCacheValid,
  buildChunkedCache,
  loadIndex,
  loadItemsFromChunks,
  IndexExtractor,
} from "../cache";
import { brewPath } from "./paths";
import { execBrew } from "./commands";
import { brewLogger, cacheLogger } from "../logger";

/// Cache Paths

const installedCachePath = cachePath("installedv2.json");
const formulaCachePath = cachePath("formula.json");
const caskCachePath = cachePath("cask.json");

/// Remote URLs

const formulaURL = "https://formulae.brew.sh/api/formula.json";
const caskURL = "https://formulae.brew.sh/api/cask.json";

const formulaRemote: ChunkedRemote<Formula> = {
  url: formulaURL,
  cachePath: formulaCachePath,
  chunkedConfig: getChunkedCacheConfig("formula"),
};

const caskRemote: ChunkedRemote<Cask> = {
  url: caskURL,
  cachePath: caskCachePath,
  chunkedConfig: getChunkedCacheConfig("cask"),
};

/** Extract index entry from a Formula */
const extractFormulaIndex: IndexExtractor<Formula> = (item, chunkNumber, indexInChunk): IndexEntry => {
  return {
    id: item.name,
    n: item.name.toLowerCase(),
    d: item.desc?.toLowerCase().slice(0, 100),
    a: item.aliases?.length > 0 ? item.aliases.map((a) => a.toLowerCase()) : undefined,
    c: chunkNumber,
    i: indexInChunk,
  };
};

/** Extract index entry from a Cask */
const extractCaskIndex: IndexExtractor<Cask> = (item, chunkNumber, indexInChunk): IndexEntry => {
  return {
    id: item.token,
    n: item.token.toLowerCase(),
    d: item.desc?.toLowerCase().slice(0, 100),
    a: item.name?.length > 0 ? item.name.map((n) => n.toLowerCase()) : undefined,
    c: chunkNumber,
    i: indexInChunk,
  };
};

/**
 * Check if the search cache files exist (formula.json and cask.json).
 * Used to determine if this is a cold start (no cache) or warm start (cache exists).
 */
export async function hasSearchCache(): Promise<boolean> {
  try {
    const [formulaStats, caskStats] = await Promise.all([fs.stat(formulaCachePath), fs.stat(caskCachePath)]);
    // Both files must exist and have content
    return formulaStats.size > 0 && caskStats.size > 0;
  } catch {
    return false;
  }
}

/**
 * Minimal installed package info parsed from `brew list --versions`.
 * This is much faster than `brew info --json=v2 --installed`.
 */
interface InstalledListItem {
  name: string;
  version: string;
  installed_on_request: boolean;
}

/**
 * Parse `brew list --versions` output into InstalledListItem array.
 * Format: "package_name version1 version2 ..." (one per line)
 */
function parseListVersionsOutput(output: string): InstalledListItem[] {
  const items: InstalledListItem[] = [];
  const lines = output
    .trim()
    .split("\n")
    .filter((line) => line.length > 0);

  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const name = parts[0];
      // Use the first (most recent) version
      const version = parts[1];
      items.push({
        name,
        version,
        // We don't know this from list output, default to true
        installed_on_request: true,
      });
    }
  }

  return items;
}

/**
 * Fetch a fast list of installed packages (names and versions only).
 * Uses `brew list --versions` which is significantly faster than `brew info --json=v2 --installed`.
 *
 * @returns Minimal installed package data for quick initial display
 */
export async function brewFetchInstalledFast(cancel?: AbortSignal): Promise<InstalledMap | undefined> {
  const startTime = Date.now();

  try {
    // Try to read from cache first
    const cacheBuffer = await fs.readFile(installedCachePath);
    const cached = JSON.parse(cacheBuffer.toString()) as InstallableResults;
    const mapped = brewMapInstalled(cached);
    const duration = Date.now() - startTime;

    cacheLogger.log("Fast load from cache", {
      formulaeCount: mapped?.formulae.size ?? 0,
      casksCount: mapped?.casks.size ?? 0,
      durationMs: duration,
    });

    return mapped;
  } catch {
    // Cache miss - fall back to fast list command
    const listStartTime = Date.now();

    try {
      // brew list --versions is fast and gives us name + version
      // Note: --versions output is "name version1 version2 ..." per line
      const [formulaeOutput, casksOutput] = await Promise.all([
        execBrew(`list --formula --versions`, cancel ? { signal: cancel } : undefined),
        execBrew(`list --cask --versions`, cancel ? { signal: cancel } : undefined),
      ]);

      const formulaeList = parseListVersionsOutput(formulaeOutput.stdout);
      const casksList = parseListVersionsOutput(casksOutput.stdout);

      // Create minimal Formula/Cask objects for display
      const formulae = new Map<string, Formula>();
      for (const item of formulaeList) {
        formulae.set(item.name, createMinimalFormula(item));
      }

      const casks = new Map<string, Cask>();
      for (const item of casksList) {
        casks.set(item.name, createMinimalCask(item));
      }

      const duration = Date.now() - listStartTime;
      brewLogger.log("Fast list fetched", {
        formulaeCount: formulae.size,
        casksCount: casks.size,
        durationMs: duration,
      });

      return { formulae, casks };
    } catch (err) {
      brewLogger.error("Fast list fetch failed", { error: err });
      return undefined;
    }
  }
}

/**
 * Create a minimal Formula object from list data.
 */
function createMinimalFormula(item: InstalledListItem): Formula {
  return {
    name: item.name,
    tap: "",
    homepage: "",
    versions: { stable: item.version, bottle: false },
    outdated: false,
    license: null,
    aliases: [],
    dependencies: [],
    build_dependencies: [],
    installed: [
      {
        version: item.version,
        installed_as_dependency: !item.installed_on_request,
        installed_on_request: item.installed_on_request,
      },
    ],
    keg_only: false,
    linked_key: "",
    pinned: false,
  };
}

/**
 * Create a minimal Cask object from list data.
 */
function createMinimalCask(item: InstalledListItem): Cask {
  return {
    token: item.name,
    name: [item.name],
    tap: "",
    homepage: "",
    version: item.version,
    versions: { stable: item.version, bottle: false },
    outdated: false,
    installed: item.version,
    auto_updates: false,
    depends_on: {},
  };
}

/**
 * Fetch all installed packages with full metadata.
 */
export async function brewFetchInstalled(useCache: boolean, cancel?: AbortSignal): Promise<InstalledMap | undefined> {
  const startTime = Date.now();
  const results = await brewFetchInstallableResults(useCache, cancel);
  const mapped = brewMapInstalled(results);
  const duration = Date.now() - startTime;

  if (mapped) {
    brewLogger.log("Installed packages fetched", {
      formulaeCount: mapped.formulae.size,
      casksCount: mapped.casks.size,
      totalCount: mapped.formulae.size + mapped.casks.size,
      durationMs: duration,
      fromCache: useCache,
    });
  }

  return mapped;
}

async function brewFetchInstallableResults(
  useCache: boolean,
  cancel?: AbortSignal,
): Promise<InstallableResults | undefined> {
  async function installed(): Promise<string> {
    return (await execBrew(`info --json=v2 --installed`, cancel ? { signal: cancel } : undefined)).stdout;
  }

  if (!useCache) {
    return JSON.parse(await installed());
  }

  async function updateCache(): Promise<InstallableResults> {
    const startTime = Date.now();
    const info = await installed();
    const parsed = JSON.parse(info) as InstallableResults;
    const duration = Date.now() - startTime;

    try {
      await fs.writeFile(installedCachePath, info);
      const responseSizeBytes = Buffer.byteLength(info, "utf8");
      const responseSizeKb = (responseSizeBytes / 1024).toFixed(2);

      cacheLogger.log("Updated installed cache", {
        path: installedCachePath,
        formulaeCount: parsed.formulae.length,
        casksCount: parsed.casks.length,
        totalCount: parsed.formulae.length + parsed.casks.length,
        durationMs: duration,
        responseSizeBytes,
        responseSizeKb: `${responseSizeKb} KB`,
      });
    } catch (err) {
      cacheLogger.error("Failed to write installed cache", {
        path: installedCachePath,
        formulaeCount: parsed.formulae.length,
        casksCount: parsed.casks.length,
        error: err,
      });
    }
    return parsed;
  }

  async function mtimeMs(path: string): Promise<number> {
    return (await fs.stat(path)).mtimeMs;
  }

  async function readCache(): Promise<InstallableResults> {
    const cacheTime = await mtimeMs(installedCachePath);
    // 'var/homebrew/locks' is updated after installed keg_only or linked formula.
    const locksTime = await mtimeMs(brewPath("var/homebrew/locks"));
    // Casks
    const caskroomTime = await mtimeMs(brewPath("Caskroom"));

    // 'var/homebrew/pinned' is updated after pin/unpin actions (but does not exist if there are no pinned formula).
    let pinnedTime;
    try {
      pinnedTime = await mtimeMs(brewPath("var/homebrew/pinned"));
    } catch {
      pinnedTime = 0;
    }
    // Because '/var/homebrew/pinned can be removed, we need to also check the parent directory'
    const homebrewTime = await mtimeMs(brewPath("var/homebrew"));

    if (homebrewTime < cacheTime && caskroomTime < cacheTime && locksTime < cacheTime && pinnedTime < cacheTime) {
      const cacheBuffer = await fs.readFile(installedCachePath);
      const cached = JSON.parse(cacheBuffer.toString()) as InstallableResults;
      cacheLogger.log("Using cached installed data", {
        path: installedCachePath,
        formulaeCount: cached.formulae.length,
        casksCount: cached.casks.length,
        totalCount: cached.formulae.length + cached.casks.length,
        cacheAgeMs: Date.now() - cacheTime,
      });
      return cached;
    } else {
      cacheLogger.log("Cache invalidated, refreshing", {
        reason: "brew state changed",
        homebrewTime,
        caskroomTime,
        locksTime,
        pinnedTime,
        cacheTime,
      });
      return await updateCache();
    }
  }

  try {
    return await readCache();
  } catch {
    return await updateCache();
  }
}

function brewMapInstalled(installed?: InstallableResults): InstalledMap | undefined {
  if (!installed) {
    return undefined;
  }

  const formulae = new Map<string, Formula>();
  for (const formula of installed.formulae) {
    formulae.set(formula.name, formula);
  }

  const casks = new Map<string, Cask>();
  for (const cask of installed.casks) {
    casks.set(cask.token, cask);
  }

  return { formulae: formulae, casks: casks };
}

/**
 * Fetch outdated packages.
 *
 * @param greedy - Include auto-updating casks
 * @param cancel - AbortController for cancellation
 * @param skipUpdate - Skip brew update (use cached index). Faster but may miss recent updates.
 */
export async function brewFetchOutdated(
  greedy: boolean,
  cancel?: AbortSignal,
  skipUpdate = false,
): Promise<OutdatedResults> {
  brewLogger.log("Fetching outdated packages", { greedy, skipUpdate });
  let cmd = `outdated --json=v2`;
  if (greedy) {
    cmd += " --greedy"; // include auto_update casks
  }
  // 'outdated' is only reliable after performing a 'brew update'
  // skipUpdate allows showing stale data quickly, then refreshing
  if (!skipUpdate) {
    await brewUpdate(cancel);
  }
  const output = await execBrew(cmd, cancel ? { signal: cancel } : undefined);
  const results = JSON.parse(output.stdout) as OutdatedResults;
  brewLogger.log("Outdated packages fetched", {
    formulaeCount: results.formulae.length,
    casksCount: results.casks.length,
    skipUpdate,
  });
  return results;
}

/**
 * Run brew update.
 */
export async function brewUpdate(cancel?: AbortSignal): Promise<void> {
  brewLogger.log("Running brew update");
  await execBrew(`update`, cancel ? { signal: cancel } : undefined);
  brewLogger.log("Brew update completed");
}

/// Chunked Cache Functions

// Mutex to prevent concurrent chunked cache builds
let formulaeChunkedBuildInProgress: Promise<void> | null = null;
let casksChunkedBuildInProgress: Promise<void> | null = null;

/**
 * Ensure chunked cache exists and is valid.
 * Downloads source JSON to disk (without parsing) and builds chunks.
 */
async function ensureChunkedCache<T>(
  remote: ChunkedRemote<T>,
  extractIndex: IndexExtractor<T>,
  onProgress?: DownloadProgressCallback,
  signal?: AbortSignal,
): Promise<void> {
  const isValid = await isChunkedCacheValid(remote.chunkedConfig, remote.url, signal);
  if (isValid) {
    return;
  }

  // Check if stale cache exists (for fallback on failure)
  let hasStaleCacheIndex = false;
  try {
    await fs.stat(remote.chunkedConfig.indexPath);
    await fs.stat(remote.chunkedConfig.metaPath);
    hasStaleCacheIndex = true;
  } catch {
    // No stale cache available
  }

  try {
    // Need to rebuild - download source JSON to disk WITHOUT parsing into memory
    // This is critical to avoid heap exhaustion on initial load
    brewLogger.log("Building chunked cache", { type: remote.chunkedConfig.type });

    // Download to disk only (no parsing)
    await downloadRemoteToCache(remote.url, remote.cachePath, onProgress, signal);

    // Now build the chunked cache from the downloaded file
    // This streams through the file and writes chunks incrementally
    await buildChunkedCache(remote.cachePath, remote.url, remote.chunkedConfig, extractIndex, onProgress, signal);
  } catch (err) {
    // Always re-throw abort errors - the caller handles these
    if (err instanceof Error && err.name === "AbortError") throw err;

    // For other errors, fall back to stale cache if available
    if (hasStaleCacheIndex) {
      brewLogger.warn("Chunked cache rebuild failed, using stale cache", {
        type: remote.chunkedConfig.type,
        error: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    // No stale cache to fall back to
    throw err;
  }
}

/**
 * Fetch the chunked index for formulae.
 * Builds chunked cache if it doesn't exist or is stale.
 */
export async function fetchFormulaIndex(
  onProgress?: DownloadProgressCallback,
  signal?: AbortSignal,
): Promise<CacheIndex> {
  // Check if already cached in memory
  if (formulaRemote.index) {
    return formulaRemote.index;
  }

  // Check if fetch is already in progress (deduplication)
  if (formulaRemote.indexFetch) {
    // Don't pass our signal to the existing build - just await it
    try {
      const result = await formulaRemote.indexFetch;
      // Check abort after awaiting another caller's build
      if (signal?.aborted) {
        const error = new Error("Aborted");
        error.name = "AbortError";
        throw error;
      }
      return result;
    } catch (err) {
      // If the existing build was aborted but OUR signal is still active, retry
      if (err instanceof Error && err.name === "AbortError" && !signal?.aborted) {
        return fetchFormulaIndex(onProgress, signal);
      }
      throw err;
    }
  }

  // Start fetch with deduplication
  formulaRemote.indexFetch = (async () => {
    // Use mutex to prevent concurrent builds
    if (formulaeChunkedBuildInProgress) {
      brewLogger.log("Waiting for existing formula chunked cache build");
      await formulaeChunkedBuildInProgress;
    } else {
      formulaeChunkedBuildInProgress = ensureChunkedCache(formulaRemote, extractFormulaIndex, onProgress, signal);
      try {
        await formulaeChunkedBuildInProgress;
      } finally {
        formulaeChunkedBuildInProgress = null;
      }
    }

    // Load index
    const index = await loadIndex(formulaRemote.chunkedConfig);
    formulaRemote.index = index;
    return index;
  })();

  try {
    return await formulaRemote.indexFetch;
  } finally {
    formulaRemote.indexFetch = undefined;
  }
}

/**
 * Fetch the chunked index for casks.
 * Builds chunked cache if it doesn't exist or is stale.
 */
export async function fetchCaskIndex(onProgress?: DownloadProgressCallback, signal?: AbortSignal): Promise<CacheIndex> {
  // Check if already cached in memory
  if (caskRemote.index) {
    return caskRemote.index;
  }

  // Check if fetch is already in progress (deduplication)
  if (caskRemote.indexFetch) {
    // Don't pass our signal to the existing build - just await it
    try {
      const result = await caskRemote.indexFetch;
      // Check abort after awaiting another caller's build
      if (signal?.aborted) {
        const error = new Error("Aborted");
        error.name = "AbortError";
        throw error;
      }
      return result;
    } catch (err) {
      // If the existing build was aborted but OUR signal is still active, retry
      if (err instanceof Error && err.name === "AbortError" && !signal?.aborted) {
        return fetchCaskIndex(onProgress, signal);
      }
      throw err;
    }
  }

  // Start fetch with deduplication
  caskRemote.indexFetch = (async () => {
    // Use mutex to prevent concurrent builds
    if (casksChunkedBuildInProgress) {
      brewLogger.log("Waiting for existing cask chunked cache build");
      await casksChunkedBuildInProgress;
    } else {
      casksChunkedBuildInProgress = ensureChunkedCache(caskRemote, extractCaskIndex, onProgress, signal);
      try {
        await casksChunkedBuildInProgress;
      } finally {
        casksChunkedBuildInProgress = null;
      }
    }

    // Load index
    const index = await loadIndex(caskRemote.chunkedConfig);
    caskRemote.index = index;
    return index;
  })();

  try {
    return await caskRemote.indexFetch;
  } finally {
    caskRemote.indexFetch = undefined;
  }
}

/**
 * Fetch specific formulae by their index entries.
 * Only loads the chunks containing the requested items.
 */
export async function fetchFormulaItems(entries: IndexEntry[]): Promise<Formula[]> {
  return loadItemsFromChunks<Formula>(formulaRemote.chunkedConfig, entries);
}

/**
 * Fetch specific casks by their index entries.
 * Only loads the chunks containing the requested items.
 */
export async function fetchCaskItems(entries: IndexEntry[]): Promise<Cask[]> {
  return loadItemsFromChunks<Cask>(caskRemote.chunkedConfig, entries);
}

/**
 * Fetch info for a single formula by name.
 * Much faster than fetching all installed packages.
 */
export async function brewFetchFormulaInfo(name: string, cancel?: AbortSignal): Promise<Formula | undefined> {
  const startTime = Date.now();
  brewLogger.log("Fetching formula info", { name });

  try {
    const output = await execBrew(`info --json=v2 ${name}`, cancel ? { signal: cancel } : undefined);
    const results = JSON.parse(output.stdout) as InstallableResults;
    const duration = Date.now() - startTime;

    if (results.formulae.length > 0) {
      brewLogger.log("Formula info fetched", { name, durationMs: duration });
      return results.formulae[0];
    }

    brewLogger.warn("Formula not found", { name, durationMs: duration });
    return undefined;
  } catch (err) {
    brewLogger.error("Failed to fetch formula info", { name, error: err });
    return undefined;
  }
}

/**
 * Fetch info for a single cask by token.
 * Much faster than fetching all installed packages.
 */
export async function brewFetchCaskInfo(token: string, cancel?: AbortSignal): Promise<Cask | undefined> {
  const startTime = Date.now();
  brewLogger.log("Fetching cask info", { token });

  try {
    const output = await execBrew(`info --json=v2 ${token}`, cancel ? { signal: cancel } : undefined);
    const results = JSON.parse(output.stdout) as InstallableResults;
    const duration = Date.now() - startTime;

    if (results.casks.length > 0) {
      brewLogger.log("Cask info fetched", { token, durationMs: duration });
      return results.casks[0];
    }

    brewLogger.warn("Cask not found", { token, durationMs: duration });
    return undefined;
  } catch (err) {
    brewLogger.error("Failed to fetch cask info", { token, error: err });
    return undefined;
  }
}
