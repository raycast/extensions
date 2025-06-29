import { environment } from "@raycast/api";
import { existsSync } from "fs";
import { chmod, mkdir, rename, rm, writeFile } from "fs/promises";
import { join } from "path";
import { Release } from "../types";
import extractZip from "extract-zip";

const cliFileName = "brightness-cli";

export function cliDirectory(): string {
  return join(environment.supportPath, "cli");
}

export function cliFilepath(): string {
  return join(cliDirectory(), cliFileName);
}

export async function getCli() {
  if (process.platform === "win32") {
    throw new Error("This command is not supported on Windows");
  }
  const cliPath = cliFilepath();
  if (existsSync(cliPath)) {
    return cliPath;
  } else {
    const cliDir = cliDirectory();
    const tempDir = join(environment.supportPath, ".tmp");

    // get assets from github api
    const releaseRes = await fetch("https://api.github.com/repos/giovacalle/brightness-cli/releases/latest");
    if (!releaseRes.ok) throw new Error("Error fetching latest release info");
    const releaseData = (await releaseRes.json()) as Release;

    // get zip, extract it to temp dir
    const zipRes = await fetch(releaseData.assets[0].browser_download_url);
    if (!zipRes.ok) throw new Error("Error fetching CLI zip file");
    try {
      const zipBuffer = await zipRes.arrayBuffer();
      await mkdir(tempDir, { recursive: true });
      const zipFilePath = join(tempDir, `${cliFileName}.zip`);
      await writeFile(zipFilePath, Buffer.from(zipBuffer));
      await extractZip(zipFilePath, { dir: tempDir });
    } catch {
      throw new Error("Error extracting CLI zip file");
    }

    // move extracted file to cli directory
    try {
      await mkdir(cliDir, { recursive: true });
      await rename(join(tempDir, cliFileName), cliPath);
    } catch {
      throw new Error("Error moving CLI file to support directory");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }

    try {
      // make the file executable
      await chmod(cliPath, "755");
    } catch {
      await rm(cliPath);
      throw new Error("Error setting permissions for CLI file");
    }

    return cliPath;
  }
}

export async function clearCliDir() {
  const cliDir = cliDirectory();
  if (existsSync(cliDir)) {
    await rm(cliDir, { recursive: true, force: true });
  }
}