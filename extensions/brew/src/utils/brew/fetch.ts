/**
 * Homebrew data fetching utilities.
 *
 * Provides functions for fetching installed and outdated packages.
 *
 * Performance optimization: Uses a two-phase loading strategy:
 * 1. Fast initial load with `brew list --versions` (returns minimal data quickly)
 * 2. Background fetch with `brew info --json=v2 --installed` for full metadata
 *
 * When `useInternalApi` preference is enabled, uses Homebrew's internal API:
 * - Formula: ~1 MB vs ~30 MB (96% smaller, much faster)
 * - Cask: Similar size but in JWS format
 */

import * as fs from "fs/promises";
import { execSync } from "child_process";
import {
  Cask,
  Formula,
  InstallableResults,
  InstalledMap,
  OutdatedResults,
  Remote,
  DownloadProgressCallback,
} from "../types";
import { cachePath, fetchRemote } from "../cache";
import { brewPath } from "./paths";
import { execBrew } from "./commands";
import { brewLogger, cacheLogger } from "../logger";
import { preferences } from "../preferences";
import { downloadAndCacheInternalFormulae, logInternalApiConfig } from "./internal-api";

/// Cache Paths

const installedCachePath = cachePath("installedv2.json");
const formulaCachePath = cachePath("formula.json");
const caskCachePath = cachePath("cask.json");

/// Remote URLs

const formulaURL = "https://formulae.brew.sh/api/formula.json";
const caskURL = "https://formulae.brew.sh/api/cask.json";

const formulaRemote: Remote<Formula> = { url: formulaURL, cachePath: formulaCachePath };
const caskRemote: Remote<Cask> = { url: caskURL, cachePath: caskCachePath };

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
        usingInternalApi: preferences.useInternalApi,
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

// Track if we've logged internal API config (only log once per session)
let hasLoggedInternalApiConfig = false;

// Mutex to prevent concurrent internal API cache updates
// This prevents memory exhaustion when multiple search calls happen simultaneously
let formulaeCacheUpdateInProgress: Promise<void> | null = null;

/**
 * Check if the internal API cache needs updating.
 * Uses HEAD request to check Last-Modified header.
 */
async function needsInternalApiCacheUpdate(internalApiUrl: string, localCachePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(localCachePath);
    if (stats.size === 0) return true;

    const response = await fetch(internalApiUrl, { method: "HEAD" });
    const lastModified = Date.parse(response.headers.get("last-modified") ?? "");

    if (lastModified > stats.mtimeMs) {
      cacheLogger.log("Internal API cache outdated", {
        cachePath: localCachePath,
        cacheTime: stats.mtimeMs,
        remoteTime: lastModified,
      });
      return true;
    }

    cacheLogger.log("Internal API cache up to date", {
      cachePath: localCachePath,
      cacheAgeMs: Date.now() - stats.mtimeMs,
    });
    return false;
  } catch {
    // Cache doesn't exist or error checking
    return true;
  }
}

/**
 * Fetch all formulae from the remote API.
 * Uses internal API when `useInternalApi` preference is enabled.
 * Falls back to public API if internal API fails.
 *
 * Hybrid approach (when useInternalApi is enabled):
 * 1. Downloads smaller internal API (~1 MB vs ~30 MB)
 * 2. Converts to standard array format and writes to cache
 * 3. Uses existing stream-json parsing for memory-efficient reading
 *
 * Internal API benefits:
 * - ~1 MB download vs ~30 MB (96% smaller)
 * - Much faster initial load
 * - Note: No description field (search by name only)
 */
export async function brewFetchFormulae(onProgress?: DownloadProgressCallback): Promise<Formula[]> {
  if (preferences.useInternalApi) {
    if (!hasLoggedInternalApiConfig) {
      logInternalApiConfig();
      hasLoggedInternalApiConfig = true;
    }
    try {
      // Check if we need to update the cache from internal API
      const internalApiUrl = "https://formulae.brew.sh/api/internal/formula." + getSystemTagForCache() + ".jws.json";
      const needsUpdate = await needsInternalApiCacheUpdate(internalApiUrl, formulaCachePath);

      if (needsUpdate) {
        // Use mutex to prevent concurrent cache updates (memory exhaustion)
        if (formulaeCacheUpdateInProgress) {
          brewLogger.log("Waiting for existing formulae cache update to complete");
          await formulaeCacheUpdateInProgress;
        } else {
          // Download internal API and write to standard cache format
          brewLogger.log("Updating formulae cache from internal API");
          formulaeCacheUpdateInProgress = downloadAndCacheInternalFormulae(formulaCachePath, onProgress);
          try {
            await formulaeCacheUpdateInProgress;
          } finally {
            formulaeCacheUpdateInProgress = null;
          }
        }
      }

      // Now use the standard fetchRemote path which uses stream-json
      // The cache file is already populated, so this will just read it
      return await fetchRemote(formulaRemote, onProgress);
    } catch (error) {
      // Internal API failed, fall back to public API
      brewLogger.warn("Internal formulae API failed, falling back to public API", {
        error: error instanceof Error ? error.message : String(error),
      });
      return await fetchRemote(formulaRemote, onProgress);
    }
  }
  return await fetchRemote(formulaRemote, onProgress);
}

/**
 * Fetch all casks from the remote API.
 * Always uses the public API with stream-json parsing for memory efficiency.
 *
 * Note: The internal API for casks is ~13 MB (vs ~30 MB public) but requires
 * complex JWS parsing that adds memory pressure. The public API's stream-json
 * parsing is more memory-efficient overall, so we use it exclusively for casks.
 *
 * The internal API is only used for formulae where the size difference is
 * significant (~1 MB vs ~30 MB, 96% smaller).
 */
export async function brewFetchCasks(onProgress?: DownloadProgressCallback): Promise<Cask[]> {
  // Always use public API for casks - stream-json parsing is more memory-efficient
  // than the JWS parsing overhead of the internal API
  return await fetchRemote(caskRemote, onProgress);
}

/**
 * Get the system tag for internal API URLs.
 * This is a local helper to avoid circular imports.
 */
function getSystemTagForCache(): string {
  // Use the same logic as internal-api.ts
  const arch = process.arch === "arm64" ? "arm64" : "x86_64";

  // Get macOS version name
  let osVersion = "sequoia"; // default
  try {
    const swVersOutput = execSync("sw_vers -productVersion", {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    const majorVersion = parseInt(swVersOutput.split(".")[0], 10);

    const versionNames: Record<number, string> = {
      15: "sequoia",
      14: "sonoma",
      13: "ventura",
      12: "monterey",
      11: "big_sur",
    };
    osVersion = versionNames[majorVersion] || "sequoia";
  } catch {
    // Use default
  }

  return `${arch}_${osVersion}`;
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
