import { environment, showToast, Toast } from "@raycast/api";
import fs from "node:fs";
import afs from "node:fs/promises";
import path from "node:path";
import { PASS_CLI_VERSION, resolveArtifact } from "./core/artifact";
import { createCliVersionReader, isSupportedCliVersion, MIN_PASS_CLI_VERSION } from "./core/cli-version";
import { installArtifact, removeOtherVersions } from "./core/installer";
import { findExecutables, isRunnableFile } from "./core/which";
import { PassCliError } from "./types";

let installPromise: Promise<string> | undefined;

const cliVersion = createCliVersionReader();

export function passCliDirectory(): string {
  return path.join(environment.supportPath, "cli", PASS_CLI_VERSION);
}

export function passCliFilepath(): string {
  const artifact = resolveArtifact(process.platform, process.arch);
  return path.join(passCliDirectory(), artifact.binaryName);
}

export function isCliInstalled(): boolean {
  const artifact = resolveArtifact(process.platform, process.arch);
  return artifact.requiredFiles.every((file) => fs.existsSync(path.join(passCliDirectory(), file)));
}

/**
 * Whether the extension runs the pass-cli it downloads, which it keeps doing once it has downloaded this version, even
 * when it's cleared to be downloaded again: the session's key in the macOS keychain only trusts the pass-cli that saved
 * it, and macOS asks before letting another one use it.
 */
function usesDownloadedCli(): boolean {
  return fs.existsSync(passCliDirectory());
}

/** On a Mac, the pass-cli the terminal would run, or the next one on the way, when it's recent enough. */
async function installedCli(searchPath: string): Promise<string | undefined> {
  if (process.platform !== "darwin") return undefined;
  for (const candidate of findExecutables("pass-cli", searchPath)) {
    const version = await cliVersion(candidate);
    if (version && isSupportedCliVersion(version)) return candidate;
  }
  return undefined;
}

let earlierCopiesRemoved = false;

/**
 * The copies of pass-cli that earlier versions of the extension downloaded, once it runs the Mac's pass-cli instead:
 * nothing runs them anymore. A download removes them too, once it's installed.
 */
async function removeEarlierCopies(): Promise<void> {
  if (earlierCopiesRemoved) return;
  earlierCopiesRemoved = true;
  await removeOtherVersions(passCliDirectory());
}

let outdatedVersion: string | undefined;

/** The version of the pass-cli at CLI Path, once it has turned out too old: for the screen that says so. */
export function outdatedCliVersion(): string | undefined {
  return outdatedVersion;
}

/**
 * The pass-cli at CLI Path, once it's known to be recent enough. One that doesn't say its version, e.g. a script that
 * doesn't pass `--version` on, runs as it is.
 */
export async function checkCliVersion(cliPath: string, env: NodeJS.ProcessEnv): Promise<string> {
  // A missing one is reported by the command itself, as before.
  if (fs.existsSync(cliPath) && !isRunnableFile(cliPath)) {
    throw new PassCliError(`CLI Path's ${cliPath} can't run`, "unrunnable_cli");
  }
  const version = await cliVersion(cliPath, env);
  if (version && !isSupportedCliVersion(version)) {
    outdatedVersion = version;
    throw new PassCliError(`CLI Path has pass-cli ${version}; ${MIN_PASS_CLI_VERSION} or later needed`, "outdated_cli");
  }
  return cliPath;
}

async function installCli(artifact: ReturnType<typeof resolveArtifact>): Promise<string> {
  const installToast = await showToast({
    style: Toast.Style.Animated,
    title: "Installing Proton Pass CLI",
    message: "Downloading binary...",
  });

  try {
    const installed = await installArtifact({
      artifact,
      download: async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
        installToast.message = "Download complete. Verifying and installing...";
        return Buffer.from(await response.arrayBuffer());
      },
      destDir: passCliDirectory(),
      tmpDir: path.join(environment.supportPath, ".tmp"),
      platform: process.platform,
    });

    console.log("pass-cli installed successfully at:", installed);
    await removeOtherVersions(passCliDirectory());
    installToast.style = Toast.Style.Success;
    installToast.title = "Proton Pass CLI Ready";
    installToast.message = "Download and installation complete.";
    return installed;
  } catch (error) {
    installToast.style = Toast.Style.Failure;
    installToast.title = "Failed to Install Proton Pass CLI";
    installToast.message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not install pass-cli: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * The pass-cli to run when CLI Path is left as pass-cli. On a Mac, the one installed there when it's recent enough,
 * unless the extension already runs the one it downloads. Otherwise the downloaded one, downloaded first if needed.
 * `searchPath` is where to look for the installed one, folder by folder.
 */
export async function ensureCli(searchPath = process.env.PATH ?? ""): Promise<string> {
  if (!usesDownloadedCli()) {
    const installed = await installedCli(searchPath);
    if (installed) {
      await removeEarlierCopies();
      return installed;
    }
  }

  const artifact = resolveArtifact(process.platform, process.arch);
  const cli = path.join(passCliDirectory(), artifact.binaryName);
  if (isCliInstalled()) {
    console.log("pass-cli already installed at:", cli);
    return cli;
  }

  const currentInstall = installPromise ?? installCli(artifact);
  installPromise = currentInstall;
  try {
    return await currentInstall;
  } finally {
    if (installPromise === currentInstall) installPromise = undefined;
  }
}

/**
 * After a logout, which removed the session's key from the keychain, the pass-cli installed on the Mac takes over from
 * the downloaded one, when it's recent enough: the next login saves a new key with it, so macOS has nothing to ask.
 */
export async function preferInstalledCli(searchPath: string): Promise<void> {
  if (!usesDownloadedCli() || !(await installedCli(searchPath))) return;
  await afs.rm(path.join(environment.supportPath, "cli"), { recursive: true, force: true });
}

export async function clearCliCache(): Promise<void> {
  const wasUsed = usesDownloadedCli();
  try {
    await afs.rm(path.join(environment.supportPath, "cli"), { recursive: true });
  } catch {
    // Ignore errors if directory doesn't exist.
  }
  // Downloaded again rather than replaced by the pass-cli installed on the Mac, which macOS would ask about.
  if (wasUsed) await afs.mkdir(passCliDirectory(), { recursive: true });
}
