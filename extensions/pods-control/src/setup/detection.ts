import { realpathSync } from "fs";
import { brewPrefixCliPath, findBrewPrefixCli, findCliPath, getConfiguredCliPath } from "../cli/discovery";
import {
  meetsMinimumVersion,
  normalizeVersion,
  readInstalledVersion,
  resolveVersionStatus,
  type VersionStatus,
} from "../cli/version";
import { findBrewCliPrefix, findBrewLatestVersion, findBrewLinkedKeg, findBrewPath } from "../homebrew/commands";
import { isBrewOperationRunning } from "../homebrew/lock";
import { MIN_CLI_VERSION } from "./constants";
import { detectDeveloperTools, type DeveloperToolsStatus } from "./developer-tools";
import { fetchLatestGithubRelease } from "./latest-release";

export type CliSetupState =
  | "installing"
  | "needs-homebrew"
  | "needs-developer-tools"
  | "invalid-cli-path"
  | "source-cli"
  | "needs-link"
  | "needs-reinstall"
  | "install"
  // Any Homebrew install, including an up-to-date one. `setupNeedsUpdate` decides whether to offer an update.
  | "update";

export type CliInstallationMethod = "homebrew" | "source";

export type LatestVersionSource = "homebrew" | "github";

export interface CliSetup {
  state: CliSetupState;
  cliPath: string | null;
  brewPath: string | null;
  brewCliPrefix: string | null;
  brewLinked: boolean | null;
  configuredCliPath: string | null;
  developerTools: DeveloperToolsStatus | null;
  installedVersion: string | null;
  latestVersion: string | null;
  latestSource: LatestVersionSource | null;
  liveCheckFailed: boolean;
  installationMethod: CliInstallationMethod | null;
  versionStatus: VersionStatus;
  meetsMinimum: boolean | null;
}

interface LatestInfo {
  version: string | null;
  source: LatestVersionSource | null;
  liveCheckFailed: boolean;
}

const UNKNOWN_VERSION = {
  installedVersion: null,
  latestVersion: null,
  latestSource: null,
  liveCheckFailed: false,
  installationMethod: null,
  versionStatus: "unknown",
  meetsMinimum: null,
} as const;

export function setupNeedsUpdate(setup: CliSetup): boolean {
  return setup.meetsMinimum === false || setup.versionStatus !== "up-to-date";
}

export async function detectCliSetup(): Promise<CliSetup> {
  const cliPath = findCliPath();
  const configuredCliPath = getConfiguredCliPath();
  const brewPath = findBrewPath();
  if (await isBrewOperationRunning()) {
    return {
      state: "installing",
      cliPath,
      configuredCliPath,
      brewPath,
      brewCliPrefix: null,
      brewLinked: null,
      developerTools: null,
      ...UNKNOWN_VERSION,
    };
  }
  const developerTools = await detectDeveloperTools();
  // Missing tools have their own recovery screen, including when brew cannot run yet.
  const brewCliPrefix = brewPath && developerTools === "ready" ? await findBrewCliPrefix(brewPath) : null;
  const details = {
    cliPath,
    configuredCliPath,
    brewPath,
    developerTools,
    brewCliPrefix,
    brewLinked: null,
    ...UNKNOWN_VERSION,
  };
  if (configuredCliPath && !cliPath) return { ...details, state: "invalid-cli-path" };
  if (developerTools !== "ready") return { ...details, state: "needs-developer-tools" };
  if (!brewPath) {
    return cliPath
      ? withVersion({ ...details, state: "source-cli", installationMethod: "source" }, githubLatest())
      : { ...details, state: "needs-homebrew" };
  }
  if (cliPath) {
    if (isBrewManagedCli(cliPath, brewCliPrefix)) {
      return withVersion({ ...details, state: "update", installationMethod: "homebrew" }, homebrewLatest(brewPath));
    }
    return withVersion({ ...details, state: "source-cli", installationMethod: "source" }, githubLatest());
  }
  if (!brewCliPrefix) return { ...details, state: "install" };
  // A keg without a usable binary cannot be repaired by linking.
  if (!findBrewPrefixCli(brewCliPrefix)) return { ...details, state: "needs-reinstall" };
  return { ...details, state: "needs-link", brewLinked: await findBrewLinkedKeg(brewPath) };
}

function isBrewManagedCli(cliPath: string, brewCliPrefix: string | null): boolean {
  return Boolean(brewCliPrefix && sameFile(cliPath, brewPrefixCliPath(brewCliPrefix)));
}

function failedLatest(): LatestInfo {
  return { version: null, source: null, liveCheckFailed: true };
}

async function homebrewLatest(brewPath: string): Promise<LatestInfo> {
  const raw = await findBrewLatestVersion(brewPath);
  const version = raw ? normalizeVersion(raw) : null;
  if (version) return { version, source: "homebrew", liveCheckFailed: false };
  return failedLatest();
}

async function githubLatest(): Promise<LatestInfo> {
  return fetchLatestGithubRelease();
}

async function withVersion(setup: CliSetup, latest: Promise<LatestInfo>): Promise<CliSetup> {
  const [installedResult, latestResult] = await Promise.allSettled([
    setup.cliPath ? readInstalledVersion(setup.cliPath) : Promise.resolve(null),
    latest,
  ]);
  const installedVersion = installedResult.status === "fulfilled" ? installedResult.value : null;
  const resolvedLatest = latestResult.status === "fulfilled" ? latestResult.value : failedLatest();
  return {
    ...setup,
    installedVersion,
    latestVersion: resolvedLatest.version,
    latestSource: resolvedLatest.source,
    liveCheckFailed: resolvedLatest.liveCheckFailed,
    versionStatus: resolveVersionStatus(installedVersion, resolvedLatest.version),
    meetsMinimum: meetsMinimumVersion(installedVersion, MIN_CLI_VERSION),
  };
}

function sameFile(first: string, second: string): boolean {
  try {
    return realpathSync(first) === realpathSync(second);
  } catch {
    return false;
  }
}
