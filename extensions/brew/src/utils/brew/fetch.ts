/**
 * Homebrew data fetching utilities.
 *
 * Provides functions for fetching installed and outdated packages.
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
 * Fetch all installed packages.
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
 */
export async function brewFetchOutdated(greedy: boolean, cancel?: AbortController): Promise<OutdatedResults> {
  brewLogger.log("Fetching outdated packages", { greedy });
  let cmd = `outdated --json=v2`;
  if (greedy) {
    cmd += " --greedy"; // include auto_update casks
  }
  // 'outdated' is only reliable after performing a 'brew update'
  await brewUpdate(cancel);
  const output = await execBrew(cmd, cancel);
  const results = JSON.parse(output.stdout) as OutdatedResults;
  brewLogger.log("Outdated packages fetched", {
    formulaeCount: results.formulae.length,
    casksCount: results.casks.length,
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
