import { exec, execSync } from "child_process";
import { promisify } from "util";
import { stat, readFile, writeFile } from "fs/promises";
import { join as path_join } from "path";
import fetch from "node-fetch";
import * as utils from "./utils";

const execp = promisify(exec);

export interface Formula {
  name: string;
  full_name: string;
  desc: string;
  license: string;
  homepage: string;
  dependencies: string[];
  build_dependencies: string[];
  installed: Installed[];
  versions: Versions;
  keg_only: bool,
  linked_key: string;
  aliases: string[];
}

export interface Installed {
  version: string;
  installed_as_dependency: bool;
  installed_on_request: bool;
}

export interface Versions {
  stable: string;
  head?: string;
  bottle: bool;
}

const installedCachePath = utils.cachePath('installed.json');
const formulaCachePath = utils.cachePath('formula.json');

const brewPrefix = (() => {
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

export async function brewFetchInstalled(useCache: bool): Promise<Formula[]> {
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

  async function readCache(): Promise<Formula[]> {
    const cellarPath = brewPath("Cellar");
    const cellarTime = (await stat(cellarPath)).mtimeMs;
    const cacheTime = (await stat(installedCachePath)).mtimeMs;
    if (cellarTime < cacheTime) {
      return JSON.parse(await readFile(installedCachePath));
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

let formulaCache: Formula[] = [];
const formulaURL = "https://formulae.brew.sh/api/formula.json";

export async function brewFetchFormula(): Promise<Formula[]> {
  if (formulaCache.length > 0) {
    return [...formulaCache];
  }

  async function readCache(): Promise<Formula[]> {
    const cacheTime = (await stat(formulaCachePath)).mtimeMs;
    const response = await fetch(formulaURL, {method: "HEAD"});
    const lastModified = Date.parse(response.headers.get('last-modified'));

    if (!isNaN(lastModified) && lastModified < cacheTime) {
      formulaCache = JSON.parse(await readFile(formulaCachePath));
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
    }
  }

  try {
    return await readCache();
  } catch {
    return await fetchFormula();
  }
}

export async function brewSearchFormula(searchText: string): Promise<Formula[]> {
  if (searchText == undefined) { return [] }

  console.log(`brewSearchFormula: ${searchText}`);
  const formulas = await brewFetchFormula();
  const target = searchText.toLowerCase();
  const results = formulas?.filter(formula => {
    return formula.name.toLowerCase().includes(target);
  });
  return results;
}

export async function brewInstall(formula: Formula): Promise<void> {
  await execp(`brew install ${formula.name}`);
}

export async function brewUninstall(formula: Formula): Promise<void> {
  await execp(`brew rm ${formula.name}`);
}

export function brewIsInstalled(formula: Formula): bool {
  return formula.installed.length > 0;
}
