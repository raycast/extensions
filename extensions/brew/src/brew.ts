import { exec, execSync } from "child_process";
import { promisify } from "util";
import { constants as fs_constants } from "fs";
import * as fs from "fs/promises";
import { join as path_join } from "path";
import { cpus } from "os";
import { environment } from "@raycast/api";
import * as utils from "./utils";
import { preferences } from "./preferences";

const execp = promisify(exec);

export interface ExecError extends Error {
  code: number;
  stdout: string;
  stderr: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
}

/// Types

export interface Nameable {
  name: string;
}

interface Installable {
  tap: string;
  desc?: string;
  homepage: string;
  versions: Versions;
  outdated: boolean;
  caveats?: string;
}

export interface Cask extends Installable {
  token: string;
  name: string[];
  version: string;
  installed?: string; // version
  auto_updates: boolean;
  depends_on: CaskDependency;
  conflicts_with?: { cask: string[] };
}

export interface CaskDependency {
  macos?: { [key: string]: string[] };
}

export interface Formula extends Installable, Nameable {
  license: string | null;
  aliases: string[];
  dependencies: string[];
  build_dependencies: string[];
  installed: InstalledVersion[];
  keg_only: boolean;
  linked_key: string;
  pinned: boolean;
  conflicts_with?: string[];
}

interface Outdated extends Nameable {
  current_version: string;
}

export interface OutdatedFormula extends Outdated {
  installed_versions: string[];
  pinned_vesion?: string;
  pinned: boolean;
}

export interface OutdatedCask extends Outdated {
  installed_versions: string;
}

export interface InstalledVersion {
  version: string;
  installed_as_dependency: boolean;
  installed_on_request: boolean;
}

export interface Versions {
  stable: string;
  head?: string;
  bottle: boolean;
}

export interface InstallableResults {
  formulae: Formula[];
  casks: Cask[];
}

export interface OutdatedResults {
  formulae: OutdatedFormula[];
  casks: OutdatedCask[];
}

export interface InstalledMap {
  formulae: Map<string, Formula>;
  casks: Map<string, Cask>;
}

/// Paths

export const brewPrefix = (() => {
  if (preferences.customBrewPath && preferences.customBrewPath.length > 0)
    return path_join(preferences.customBrewPath, "..", "..");
  try {
    return execSync("brew --prefix", { encoding: "utf8" }).trim();
  } catch {
    return cpus()[0].model.includes("Apple") ? "/opt/homebrew" : "/usr/local";
  }
})();

export const brewPath = (suffix: string) => path_join(brewPrefix, suffix);
export const brewExecutable = () => brewPath("bin/brew");

/// Fetching

const installedCachePath = utils.cachePath("installedv2.json");
const formulaCachePath = utils.cachePath("formula.json");
const caskCachePath = utils.cachePath("cask.json");

export async function brewFetchInstalled(
  useCache: boolean,
  cancel?: AbortController,
): Promise<InstalledMap | undefined> {
  const results = await brewFetchInstallableResults(useCache, cancel);
  return brewMapInstalled(results);
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
    const info = await installed();
    try {
      await fs.writeFile(installedCachePath, info);
    } catch (err) {
      console.error("Failed to write installed cache:", err);
    }
    return JSON.parse(info);
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
      return JSON.parse(cacheBuffer.toString());
    } else {
      console.error("Invalid cache");
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

export async function brewFetchOutdated(greedy: boolean, cancel?: AbortController): Promise<OutdatedResults> {
  let cmd = `outdated --json=v2`;
  if (greedy) {
    cmd += " --greedy"; // include auto_update casks
  }
  // 'outdated' is only reliable after performing a 'brew update'
  await brewUpdate(cancel);
  const output = await execBrew(cmd, cancel);
  return JSON.parse(output.stdout);
}

/// Search

const formulaURL = "https://formulae.brew.sh/api/formula.json";
const caskURL = "https://formulae.brew.sh/api/cask.json";

const formulaRemote: utils.Remote<Formula> = { url: formulaURL, cachePath: formulaCachePath };
const caskRemote: utils.Remote<Cask> = { url: caskURL, cachePath: caskCachePath };

// Store the query so that text entered during the initial fetch is respected.
let searchQuery: string | undefined;

export async function brewFetchFormulae(): Promise<Formula[]> {
  return await utils.fetchRemote(formulaRemote);
}

export async function brewFetchCasks(): Promise<Cask[]> {
  return await utils.fetchRemote(caskRemote);
}

export async function brewSearch(
  searchText: string,
  limit?: number,
  signal?: AbortSignal,
): Promise<InstallableResults> {
  searchQuery = searchText;

  let formulae = await brewFetchFormulae();

  if (signal?.aborted) {
    const error = new Error("Aborted");
    error.name = "AbortError";
    throw error;
  }

  let casks = await brewFetchCasks();

  if (signal?.aborted) {
    const error = new Error("Aborted");
    error.name = "AbortError";
    throw error;
  }

  if (searchQuery.length > 0) {
    const target = searchQuery.toLowerCase();
    formulae = formulae
      ?.filter((formula) => {
        return formula.name.toLowerCase().includes(target) || formula.desc?.toLowerCase().includes(target);
      })
      .sort((lhs, rhs) => {
        return brewCompare(lhs.name, rhs.name, target);
      });

    casks = casks
      ?.filter((cask) => {
        return (
          cask.token.toLowerCase().includes(target) ||
          cask.name.some((name) => name.toLowerCase().includes(target)) ||
          cask.desc?.toLowerCase().includes(target)
        );
      })
      .sort((lhs, rhs) => {
        return brewCompare(lhs.token, rhs.token, target);
      });
  }

  const formulaeLen = formulae.length;
  const casksLen = casks.length;

  if (limit) {
    formulae = formulae.slice(0, limit);
    casks = casks.slice(0, limit);
  }

  formulae.totalLength = formulaeLen;
  casks.totalLength = casksLen;

  return { formulae: formulae, casks: casks };
}

/// Actions

export async function brewInstall(installable: Cask | Formula, cancel?: AbortController): Promise<void> {
  const identifier = brewIdentifier(installable);
  await execBrew(`install ${brewQuarantineOption()} ${brewCaskOption(installable)} ${identifier}`, cancel);
  if (isCask(installable)) {
    installable.installed = installable.version;
  } else {
    installable.installed = [
      { version: installable.versions.stable, installed_as_dependency: false, installed_on_request: true },
    ];
  }
}

export async function brewUninstall(installable: Cask | Nameable, cancel?: AbortController): Promise<void> {
  const identifier = brewIdentifier(installable);
  await execBrew(`rm ${brewCaskOption(installable, true)} ${identifier}`, cancel);
}

export async function brewUpgrade(upgradable: Cask | Nameable, cancel?: AbortController): Promise<void> {
  const identifier = brewIdentifier(upgradable);
  await execBrew(`upgrade ${brewQuarantineOption()} ${brewCaskOption(upgradable)} ${identifier}`, cancel);
}

export async function brewUpgradeAll(greedy: boolean, cancel?: AbortController): Promise<void> {
  let cmd = `upgrade ${brewQuarantineOption()}`;
  if (greedy) {
    cmd += " --greedy";
  }
  await execBrew(cmd, cancel);
}

export async function brewCleanup(withoutThreshold: boolean, cancel?: AbortController): Promise<void> {
  let cmd = `cleanup`;
  if (withoutThreshold) {
    cmd += " --prune=all";
  }
  await execBrew(cmd, cancel);
}

export async function brewPinFormula(formula: Formula | OutdatedFormula): Promise<void> {
  await execBrew(`pin ${formula.name}`);
  formula.pinned = true;
}

export async function brewUnpinFormula(formula: Formula | OutdatedFormula): Promise<void> {
  await execBrew(`unpin ${formula.name}`);
  formula.pinned = false;
}

export async function brewDoctor(): Promise<string> {
  try {
    const output = await execBrew(`doctor`);
    return output.stdout;
  } catch (err) {
    const execErr = err as ExecError;
    if (execErr?.code === 1) {
      return execErr.stderr;
    } else {
      return `${err}`;
    }
  }
}

export async function brewUpdate(cancel?: AbortController): Promise<void> {
  await execBrew(`update`, cancel);
}

/// Commands

export function brewInstallCommand(installable: Cask | Formula | Nameable): string {
  const identifier = brewIdentifier(installable);
  return `${brewExecutable()} install ${brewCaskOption(installable)} ${identifier}`.replace(/ +/g, " ");
}

export function brewUninstallCommand(installable: Cask | Formula | Nameable): string {
  const identifier = brewIdentifier(installable);
  return `${brewExecutable()} uninstall ${brewCaskOption(installable, true)} ${identifier}`.replace(/ +/g, " ");
}

export function brewUpgradeCommand(upgradable: Cask | Formula | Nameable): string {
  const identifier = brewIdentifier(upgradable);
  return `${brewExecutable()} upgrade ${brewCaskOption(upgradable)} ${identifier}`.replace(/ +/g, " ");
}

/// Utilities

export function brewName(item: Cask | Nameable): string {
  if (isCask(item)) {
    return item.name && item.name[0] ? item.name[0] : "Unknown";
  } else {
    return item.name;
  }
}

export function brewIsInstalled(installable: Cask | Formula): boolean {
  if (isCask(installable)) {
    return caskIsInstalled(installable);
  } else {
    return formulaIsInstalled(installable);
  }
}

export function brewInstallPath(installable: Cask | Formula): string {
  if (isCask(installable)) {
    return caskInstallPath(installable);
  } else {
    return formulaInstallPath(installable);
  }
}

export function brewFormatVersion(installable: Cask | Formula): string {
  if (isCask(installable)) {
    return caskFormatVersion(installable);
  } else {
    return formulaFormatVersion(installable);
  }
}

/// Private

function caskFormatVersion(cask: Cask): string {
  if (!cask.installed) {
    return "";
  }

  let version = cask.installed;
  if (cask.outdated) {
    version += " (O)";
  }
  return version;
}

function caskIsInstalled(cask: Cask): boolean {
  if (cask.installed) {
    return cask.installed.length > 0;
  }
  return false;
}

function caskInstallPath(cask: Cask): string {
  // Casks are not updated as reliably, so we don't include the cask installed version here.
  const basePath = brewPath(path_join("Caskroom", cask.token));
  if (cask.installed) {
    return path_join(basePath, cask.installed);
  } else {
    return basePath;
  }
}

function formulaInstallPath(formula: Formula): string {
  const basePath = brewPath(path_join("Cellar", formula.name));
  if (formula.installed.length) {
    return path_join(basePath, formula.installed[0].version);
  } else {
    return basePath;
  }
}

function formulaFormatVersion(formula: Formula): string {
  if (!formula.installed.length) {
    return "";
  }

  const installed_version = formula.installed[0];
  let version = installed_version.version;
  let status = "";
  if (installed_version.installed_as_dependency) {
    status += "D";
  }
  if (formula.pinned) {
    status += "P";
  }
  if (formula.outdated) {
    status += "O";
  }
  if (status) {
    version += ` (${status})`;
  }
  return version;
}

function formulaIsInstalled(formula: Formula): boolean {
  return formula.installed.length > 0;
}

function brewIdentifier(item: Cask | Nameable): string {
  return isCask(item) ? item.token : item.name;
}

function brewCaskOption(maybeCask: Cask | Nameable, zappable = false): string {
  return isCask(maybeCask) ? "--cask" + (zappable && preferences.zapCask ? " --zap" : "") : "";
}

function brewQuarantineOption(): string {
  return preferences.quarantine ? "--quarantine" : "--no-quarantine";
}

function isCask(maybeCask: Cask | Nameable): maybeCask is Cask {
  return (maybeCask as Cask).token != undefined;
}

function brewCompare(lhs: string, rhs: string, target: string): number {
  const lhs_matches = lhs.toLowerCase().includes(target);
  const rhs_matches = rhs.toLowerCase().includes(target);
  if (lhs_matches && !rhs_matches) {
    return -1;
  } else if (rhs_matches && !lhs_matches) {
    return 1;
  } else {
    return lhs.localeCompare(rhs);
  }
}

async function execBrew(cmd: string, cancel?: AbortController): Promise<ExecResult> {
  try {
    const env = await execBrewEnv();
    return await execp(`${brewExecutable()} ${cmd}`, { signal: cancel?.signal, env: env, maxBuffer: 10 * 1024 * 1024 });
  } catch (err) {
    const execErr = err as ExecError;
    if (preferences.customBrewPath && execErr && execErr.code === 127) {
      execErr.stderr = `Brew executable not found at: ${preferences.customBrewPath}`;
      throw execErr;
    } else {
      throw err;
    }
  }
}

async function execBrewEnv(): Promise<NodeJS.ProcessEnv> {
  const askpassPath = path_join(environment.assetsPath, "askpass.sh");
  try {
    await fs.access(askpassPath, fs_constants.X_OK);
  } catch {
    await fs.chmod(askpassPath, 0o755);
  }
  const env = process.env;
  env["SUDO_ASKPASS"] = askpassPath;
  // Use HOMEBREW_BROWSER to pass through the app's bundle identifier.
  // Brew will ignore custom environment variables.
  env["HOMEBREW_BROWSER"] = utils.bundleIdentifier;
  return env;
}
