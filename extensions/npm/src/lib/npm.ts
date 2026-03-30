import {
  closeMainWindow,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { normalizeExternalUrl, toErrorMessage } from "./format";
import { InstalledPackage, OutdatedPackage } from "./types";

const execFileAsync = promisify(execFile);
const MAX_BUFFER = 20 * 1024 * 1024;

interface Preferences {
  customNpmPath?: string;
  closeAfterAction?: boolean;
}

interface NpmListPackage {
  version?: string;
  description?: string;
  license?: string;
  path?: string;
  homepage?: string;
  repository?: string | { url?: string };
  bin?: string | Record<string, string>;
}

interface NpmListResponse {
  dependencies?: Record<string, NpmListPackage>;
}

interface NpmOutdatedResponse {
  [name: string]: {
    current: string;
    wanted: string;
    latest: string;
    location?: string;
  };
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

function getNpmExecutable(): string {
  return getPreferences().customNpmPath?.trim() || "npm";
}

async function runNpmCommand(
  args: string[],
  options?: {
    allowFailure?: boolean;
  },
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const command = [
    shellEscape(getNpmExecutable()),
    ...args.map(shellEscape),
  ].join(" ");

  try {
    const result = await execFileAsync("/bin/zsh", ["-lc", command], {
      maxBuffer: MAX_BUFFER,
    });

    return {
      stdout: String(result.stdout ?? ""),
      stderr: String(result.stderr ?? ""),
      exitCode: 0,
    };
  } catch (error) {
    const stdout = String((error as { stdout?: string }).stdout ?? "");
    const stderr = String((error as { stderr?: string }).stderr ?? "");
    const exitCode =
      typeof (error as { code?: unknown }).code === "number"
        ? ((error as { code: number }).code ?? 1)
        : 1;

    if (!options?.allowFailure) {
      throw new Error(
        stderr.trim() || stdout.trim() || `npm exited with code ${exitCode}.`,
      );
    }

    return { stdout, stderr, exitCode };
  }
}

async function runJsonCommand<T>(
  args: string[],
  options?: {
    allowFailure?: boolean;
    fallbackValue?: T;
  },
): Promise<T> {
  const { stdout } = await runNpmCommand([...args, "--json"], {
    allowFailure: options?.allowFailure,
  });

  if (!stdout.trim()) {
    return options?.fallbackValue ?? ({} as T);
  }

  try {
    return JSON.parse(stdout) as T;
  } catch {
    if (options?.fallbackValue !== undefined) {
      return options.fallbackValue;
    }

    throw new Error("Failed to parse npm JSON output.");
  }
}

function getRepositoryUrl(
  repository?: string | { url?: string },
): string | undefined {
  if (typeof repository === "string") {
    return normalizeExternalUrl(repository);
  }

  return normalizeExternalUrl(repository?.url);
}

function getBinNames(bin?: string | Record<string, string>): string[] {
  if (!bin) {
    return [];
  }

  if (typeof bin === "string") {
    return [bin];
  }

  return Object.keys(bin);
}

function sortByName<T extends { name: string }>(left: T, right: T): number {
  return left.name.localeCompare(right.name);
}

function maybeCloseAfterAction(): Promise<void> | void {
  if (getPreferences().closeAfterAction) {
    return closeMainWindow();
  }
}

async function runMutation(
  args: string[],
  loadingTitle: string,
  successTitle: string,
): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: loadingTitle,
  });

  try {
    await runNpmCommand(args);
    toast.style = Toast.Style.Success;
    toast.title = successTitle;
    await maybeCloseAfterAction();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "npm command failed";
    toast.message = toErrorMessage(error);
    throw error;
  }
}

export function buildInstallCommand(name: string): string {
  return `${getNpmExecutable()} install -g ${name}`;
}

export function buildUpdateCommand(name: string): string {
  return `${getNpmExecutable()} install -g ${name}@latest`;
}

export function buildUpdateAllCommand(): string {
  return `${getNpmExecutable()} update -g`;
}

export function buildUninstallCommand(name: string): string {
  return `${getNpmExecutable()} uninstall -g ${name}`;
}

export function buildVerifyCacheCommand(): string {
  return `${getNpmExecutable()} cache verify`;
}

export function buildCleanCacheCommand(): string {
  return `${getNpmExecutable()} cache clean --force`;
}

export function getPackageUrl(name: string): string {
  return `https://www.npmjs.com/package/${name}`;
}

export async function getInstalledPackages(): Promise<InstalledPackage[]> {
  const data = await runJsonCommand<NpmListResponse>([
    "ls",
    "-g",
    "--depth=0",
    "--long",
  ]);

  return Object.entries(data.dependencies ?? {})
    .map(([name, pkg]) => ({
      name,
      version: pkg.version ?? "unknown",
      description: pkg.description,
      license: pkg.license,
      path: pkg.path,
      homepageUrl: normalizeExternalUrl(pkg.homepage),
      repositoryUrl: getRepositoryUrl(pkg.repository),
      binNames: getBinNames(pkg.bin),
    }))
    .sort(sortByName);
}

export async function getOutdatedPackages(): Promise<OutdatedPackage[]> {
  const data = await runJsonCommand<NpmOutdatedResponse>(["outdated", "-g"], {
    allowFailure: true,
    fallbackValue: {},
  });

  return Object.entries(data)
    .map(([name, pkg]) => ({
      name,
      current: pkg.current,
      wanted: pkg.wanted,
      latest: pkg.latest,
      location: pkg.location,
    }))
    .sort(sortByName);
}

export async function installGlobalPackage(name: string): Promise<void> {
  await runMutation(
    ["install", "-g", name],
    `Installing ${name}`,
    `${name} installed`,
  );
}

export async function updateGlobalPackage(name: string): Promise<void> {
  await runMutation(
    ["install", "-g", `${name}@latest`],
    `Updating ${name}`,
    `${name} updated`,
  );
}

export async function updateAllGlobalPackages(): Promise<void> {
  await runMutation(
    ["update", "-g"],
    "Updating global packages",
    "Global packages updated",
  );
}

export async function uninstallGlobalPackage(name: string): Promise<void> {
  await runMutation(
    ["uninstall", "-g", name],
    `Uninstalling ${name}`,
    `${name} uninstalled`,
  );
}

export async function verifyNpmCache(): Promise<void> {
  await runMutation(
    ["cache", "verify"],
    "Verifying npm cache",
    "npm cache verified",
  );
}

export async function cleanNpmCache(): Promise<void> {
  await runMutation(
    ["cache", "clean", "--force"],
    "Clearing npm cache",
    "npm cache cleared",
  );
}
