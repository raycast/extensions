import { environment, showToast, Toast } from "@raycast/api";
import fs from "node:fs";
import afs from "node:fs/promises";
import path from "node:path";
import { PASS_CLI_VERSION, resolveArtifact } from "./core/artifact";
import { installArtifact } from "./core/installer";

let installPromise: Promise<string> | undefined;

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

export async function ensureCli(): Promise<string> {
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

export async function clearCliCache(): Promise<void> {
  try {
    await afs.rm(path.join(environment.supportPath, "cli"), { recursive: true });
  } catch {
    // Ignore errors if directory doesn't exist.
  }
}
