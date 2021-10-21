import { exec } from "child_process";
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
  installed: InstalledVersion[];
  versions: ForumulaVersions;
  keg_only: bool,
  linked_key: string;
  aliases: string[];
}

export interface InstalledVersion {
  version: string;
}

export interface ForumulaVersions {
  stable: string;
  head?: string;
  bottle: bool;
}

const installedCachePath = utils.cachePath('installed.json');
const formulaCachePath = utils.cachePath('formula.json');

export async function brewPrefix(): Promise<string> {
  return (await execp(`brew --prefix`)).stdout.trim();
}

export async function brewPath(suffix: string): Promise<string> {
  const prefix = await brewPrefix();
  return path_join(prefix, suffix);
}

export async function brewInstalled(useCache: bool): Promise<Formula[]> {
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
    const cellarPath = await brewPath("Cellar");
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
    return formulaCache;
  }

  async function readCache(): Promise<Formula[]> {
    const cacheTime = (await stat(formulaCachePath)).mtimeMs;
    const response = await fetch(formulaURL, {method: "HEAD"});
    const lastModified = Date.parse(response.headers.get('last-modified'));

    if (!isNaN(lastModified) && lastModified < cacheTime) {
      return JSON.parse(await readFile(formulaCachePath));
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
      return formulaCache;
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

// TODO: Actions
// brew doctor
// brew install
// brew uninstall
// search via //registry.npmjs.org/algoliasearch ??
// OR we just GET https://formulae.brew.sh/api/formula.json and keep list in memory?
// Not optimal, but might be best for v1

/*
      function loadSearch(lang, site) {
        docsearch(Object.assign(
          { algoliaOptions: { facetFilters: ['lang: ' + lang, 'site: ' + site] } },
          {"apiKey":"a57ef92bf2adfae863a201ee43d6b5a1","indexName":"brew_all","inputSelector":"#search-bar"}
        ));
        window.location.hash || document.querySelector("#search-bar").focus();
        document.querySelector("#search-bar").value = new URLSearchParams(window.location.search).get('search');
      };
*/


/*
  {
    "name": "autoconf",
    "full_name": "autoconf",
    "tap": "homebrew/core",
    "aliases": [
      "autoconf@2.71"
    ],
    "versioned_formulae": [
      "autoconf@2.69",
      "autoconf@2.13"
    ],
    "desc": "Automatic configure script builder",
    "license": "GPL-3.0-or-later and (GPL-3.0-or-later with Autoconf-exception-3.0)",
    "homepage": "https://www.gnu.org/software/autoconf",
    "versions": {
      "stable": "2.71",
      "head": null,
      "bottle": true
    },
    "urls": {
      "stable": {
        "url": "https://ftp.gnu.org/gnu/autoconf/autoconf-2.71.tar.gz",
        "tag": null,
        "revision": null
      }
    },
    "revision": 0,
    "version_scheme": 0,
    "keg_only": false,
    "build_dependencies": [

    ],
    "dependencies": [
      "m4"
    ],
    "requirements": [

    ],
    "conflicts_with": [

    ],
    "installed": [
      {
        "version": "2.71",
        "used_options": [

        ],
        "built_as_bottle": true,
        "poured_from_bottle": true,
        "runtime_dependencies": [
          {
            "full_name": "m4",
            "version": "1.4.18"
          }
        ],
        "installed_as_dependency": false,
        "installed_on_request": true
      }
    ],
    "linked_keg": "2.71",
    "pinned": false,
    "outdated": false,
    "deprecated": false,
    "deprecation_date": null,
    "deprecation_reason": null,
    "disabled": false,
    "disable_date": null,
    "disable_reason": null
  },
*/
