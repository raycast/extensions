import { exec, execSync } from "child_process";
import { promisify } from "util";
import { stat, readFile, writeFile } from "fs/promises";
import { join as path_join } from "path";
import fetch from "node-fetch";
import * as utils from "./utils";

const execp = promisify(exec);

export interface FormulaBase {
  name: string;
  pinned: boolean;
}

export interface Formula extends FormulaBase {
  full_name: string;
  desc: string;
  license: string;
  homepage: string;
  aliases: string[];
  dependencies: string[];
  build_dependencies: string[];
  conflicts_with: string[];
  installed: Installed[];
  versions: Versions;
  keg_only: boolean,
  linked_key: string;
  outdated: boolean;
  caveats?: string;
}

export interface OutdatedFormula extends FormulaBase {
  installed_versions: string[];
  current_version: string;
  pinned_vesion?: string;
}

export interface Installed {
  version: string;
  installed_as_dependency: boolean;
  installed_on_request: boolean;
}

export interface Versions {
  stable: string;
  head?: string;
  bottle: boolean;
}

const installedCachePath = utils.cachePath('installed.json');
const formulaCachePath = utils.cachePath('formula.json');

export const brewPrefix = (() => {
  return execSync('brew --prefix', {encoding: 'utf8'}).trim();
})();

export function brewPath(suffix: string): string {
  return path_join(brewPrefix, suffix);
}

export function brewInstallPath(formula: Formula): string {
  const basePath = brewPath(path_join('Cellar', formula.name));
  if (formula.installed.length) {
    return path_join(basePath, formula.installed[0].version);
  } else {
    return basePath;
  }
}

export async function brewFetchInstalled(useCache: boolean): Promise<Formula[]> {
  async function installed(): Promise<string> {
    return (await execp(`brew info --json --installed`)).stdout;
  }

  if (!useCache) {
    return JSON.parse(await installed());
  }

  async function updateCache(): Promise<Formula[]> {
    const info = await installed();
    try {
      await writeFile(installedCachePath, info);
    } catch (err) {
      console.error("Failed to write installed cache:", err)
    }
    return JSON.parse(info);
  }

  async function mtimeMs(path: string): Promise<number> {
    return (await stat(path)).mtimeMs;
  }

  async function readCache(): Promise<Formula[]> {
    const cacheTime = await mtimeMs(installedCachePath);
    // 'var/homebrew/locks' is updated after installed keg_only or linked formula.
    const locksTime = await mtimeMs(brewPath('var/homebrew/locks'));
    // Because '/var/homebrew/pinned can be removed, we need to also check the parent directory'
    const homebrewTime = await mtimeMs(brewPath('var/homebrew'));
    // 'var/homebrew/pinned' is updated after pin/unpin actions (but does not exist if there are no pinned formula).
    let pinnedTime;
    try {
      pinnedTime = await mtimeMs(brewPath('var/homebrew/pinned'));
    } catch {
      pinnedTime = 0;
    }

    if (homebrewTime < cacheTime && locksTime < cacheTime && pinnedTime < cacheTime) {
      const cacheBuffer = await readFile(installedCachePath);
      return JSON.parse(cacheBuffer.toString());
    } else {
      throw 'Invalid cache';
    }
  }

  try {
    return await readCache();
  } catch {
    return await updateCache();
  }
}

export async function brewFetchOutdated(): Promise<OutdatedFormula[]> {
  // TD: Handle casks
  const outdated = JSON.parse((await execp(`brew outdated --json`)).stdout);
  return outdated['formulae'] ?? [];
}

let formulaCache: Formula[] = [];
const formulaURL = "https://formulae.brew.sh/api/formula.json";

export async function brewFetchFormula(): Promise<Formula[]> {
  if (formulaCache.length > 0) {
    return [...formulaCache];
  }

  async function readCache(): Promise<Formula[]> {
    const cacheTime = (await stat(formulaCachePath)).mtimeMs;
    const response = await fetch(formulaURL, {method: "HEAD"});
    const lastModified = Date.parse(response.headers.get('last-modified') ?? "");

    if (!isNaN(lastModified) && lastModified < cacheTime) {
      const cacheBuffer = await readFile(formulaCachePath);
      formulaCache = JSON.parse(cacheBuffer.toString());
      return [...formulaCache];
    } else {
      throw 'Invalid cache';
    }
  }

  async function fetchFormula(): Promise<Formula[]> {
    try {
      const response = await fetch("https://formulae.brew.sh/api/formula.json");
      formulaCache = await response.json();
      try {
        await writeFile(formulaCachePath, JSON.stringify(formulaCache));
      } catch (err) {
        console.error("Failed to write formula cache:", err)
      }
      return [...formulaCache];
    } catch (e) {
      console.log("fetch error:", e);
      return [];
    }
  }

  try {
    return await readCache();
  } catch {
    return await fetchFormula();
  }
}

export async function brewSearchFormula(searchText?: string): Promise<Formula[]> {
  if (searchText == undefined) { return [] }

  const formulas = await brewFetchFormula();
  const target = searchText.toLowerCase();
  const results = formulas?.filter(formula => {
    return formula.name.toLowerCase().includes(target);
  });
  return results;
}

/// Actions

export async function brewInstall(formula: Formula): Promise<void> {
  await execp(`brew install ${formula.name}`);
}

export async function brewUninstall(formula: Formula): Promise<void> {
  await execp(`brew rm ${formula.name}`);
}

export async function brewPinFormula(formula: FormulaBase): Promise<void> {
  await execp(`brew pin ${formula.name}`);
  formula.pinned = true;
}

export async function brewUnpinFormula(formula: FormulaBase): Promise<void> {
  await execp(`brew unpin ${formula.name}`);
  formula.pinned = false;
}

export async function brewUpgrade(formula: FormulaBase): Promise<void> {
  await execp(`brew upgrade ${formula.name}`);
}

export async function brewUpgradeAll(): Promise<void> {
  await execp(`brew upgrade`);
}

/// Utilities

export function brewFormatVersion(formula: Formula): string {
  let version = "";
  if (formula.installed.length > 0) {
    const installed_version = formula.installed[0];
    version = installed_version.version;
    let status = "";
    if (installed_version.installed_as_dependency) {
      status += 'D';
    }
    if (formula.pinned) {
      status += 'P';
    }
    if (formula.outdated) {
      status += 'O';
    }
    if (status) {
      version += ` (${status})`;
    }
  }
  return version;
}

export function brewIsInstalled(formula: Formula): boolean {
  return formula.installed.length > 0;
}
