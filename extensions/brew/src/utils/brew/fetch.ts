/**
 * Homebrew data fetching utilities.
 *
 * Provides functions for fetching installed and outdated packages.
 *
 * Performance optimization: Uses a two-phase loading strategy:
 * 1. Fast initial load with `brew list --json` (returns minimal data quickly)
 * 2. Background fetch with `brew info --json=v2 --installed` for full metadata
 */

import * as fs from "fs/promises";
import { Cask, Formula, InstallableResults, InstalledMap, OutdatedResults, Remote } from "../types";
import { cachePath, fetchRemote } from "../cache";
import { brewPath } from "./paths";
import { execBrew } from "./commands";
import { brewLogger, cacheLogger } from "../logger";
import { preferences } from "../preferences";

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
 * Minimal installed package info from `brew list --json`.
 * This is much faster than `brew info --json=v2 --installed`.
 */
interface InstalledListItem {
  name: string;
  version: string;
  installed_on_request: boolean;
}

/**
 * Fetch a fast list of installed packages (names and versions only).
 * Uses `brew list --json` which is significantly faster than `brew info --json=v2 --installed`.
 *
 * @returns Minimal installed package data for quick initial display
 */
export async function brewFetchInstalledFast(cancel?: AbortController): Promise<InstalledMap | undefined> {
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
      // brew list --json is much faster than brew info --json=v2 --installed
      const [formulaeOutput, casksOutput] = await Promise.all([
        execBrew(`list --formula --json`, cancel),
        execBrew(`list --cask --json`, cancel),
      ]);

      const formulaeList = JSON.parse(formulaeOutput.stdout) as InstalledListItem[];
      const casksList = JSON.parse(casksOutput.stdout) as InstalledListItem[];

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
export async function brewFetchInstalled(
  useCache: boolean,
  cancel?: AbortController,
): Promise<InstalledMap | undefined> {
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
  cancel?: AbortController,
): Promise<InstallableResults | undefined> {
  async function installed(): Promise<string> {
    return (await execBrew(`info --json=v2 --installed`, cancel)).stdout;
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
  cancel?: AbortController,
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
  const output = await execBrew(cmd, cancel);
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
export async function brewUpdate(cancel?: AbortController): Promise<void> {
  brewLogger.log("Running brew update");
  await execBrew(`update`, cancel);
  brewLogger.log("Brew update completed");
}

/**
 * Fetch all formulae from the remote API.
 */
export async function brewFetchFormulae(): Promise<Formula[]> {
  return await fetchRemote(formulaRemote);
}

/**
 * Fetch all casks from the remote API.
 */
export async function brewFetchCasks(): Promise<Cask[]> {
  return await fetchRemote(caskRemote);
}

/**
 * Fetch info for a single formula by name.
 * Much faster than fetching all installed packages.
 */
export async function brewFetchFormulaInfo(name: string, cancel?: AbortController): Promise<Formula | undefined> {
  const startTime = Date.now();
  brewLogger.log("Fetching formula info", { name });

  try {
    const output = await execBrew(`info --json=v2 ${name}`, cancel);
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
export async function brewFetchCaskInfo(token: string, cancel?: AbortController): Promise<Cask | undefined> {
  const startTime = Date.now();
  brewLogger.log("Fetching cask info", { token });

  try {
    const output = await execBrew(`info --json=v2 ${token}`, cancel);
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
