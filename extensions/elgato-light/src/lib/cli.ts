import { environment } from "@raycast/api";
import path from "path";
import fs from "fs";
import os from "os";
import afs from "fs/promises";
import https from "https";
import * as tar from "tar";
import { execFile } from "child_process";
import sha256 from "sha256-file";

const cliVersion = "1.3.0";
const cliFileInfos = {
  x64: {
    arch: "x86_64",
    pkg: "elgato-light-Darwin-x86_64.tar.gz",
    sha256: "f39f154b3ffc210e4886cfc78bf8ea0e74f07595cb79df5d67451e7950897513",
  },
  arm64: {
    arch: "aarch64",
    pkg: "elgato-light-Darwin-aarch64.tar.gz",
    sha256: "aa90b2cb9cdc970c311ec3d7a764b70f2dc637696c98e024bb6711d4da2d86cb",
  },
};
const cliFileInfo = os.arch() === "arm64" ? cliFileInfos.arm64 : cliFileInfos.x64;

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          const redirectUrl = response.headers.location;
          if (!redirectUrl) {
            reject(new Error("Redirect with no location header"));
            return;
          }
          file.close();
          fs.unlinkSync(dest);
          downloadFile(redirectUrl, dest).then(resolve).catch(reject);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
        file.on("error", reject);
      })
      .on("error", (error) => {
        fs.unlink(dest, () => reject(error));
      });
  });
}

async function sha256FileHash(filename: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    sha256(filename, (error: Error | null, sum: string | null) => {
      if (error) {
        reject(error);
      } else {
        resolve(sum);
      }
    });
  });
}

function elgatoLightCLIDirectory(): string {
  return path.join(environment.supportPath, "cli");
}

export function elgatoCLIFilePath(): string {
  return path.join(elgatoLightCLIDirectory(), "elgato-light");
}

function cliVersionFilePath(): string {
  return path.join(elgatoLightCLIDirectory(), "elgato-light.version");
}

function isCurrentVersion(): boolean {
  try {
    return fs.readFileSync(cliVersionFilePath(), "utf-8").trim() === cliVersion;
  } catch {
    return false;
  }
}

export async function execute(args: string[]): Promise<void> {
  const cliPath = await ensureCLI();

  return new Promise((resolve, reject) => {
    execFile(cliPath, args, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(stderr.trim() || error.message));
      } else {
        resolve();
      }
    });
  });
}

export async function ensureCLI() {
  const cli = elgatoCLIFilePath();

  if (fs.existsSync(cli) && isCurrentVersion()) {
    return cli;
  }

  // Remove outdated binary before re-downloading
  if (fs.existsSync(cli)) {
    fs.unlinkSync(cli);
  }

  const repoUrl = "https://github.com/wassimk/elgato-light";
  const binaryURL = `${repoUrl}/releases/download/v${cliVersion}/${cliFileInfo.pkg}`;
  const cliDir = path.join(environment.supportPath, "cli");
  const tempDir = path.join(environment.supportPath, ".tmp");

  await afs.mkdir(tempDir, { recursive: true });
  const archivePath = path.join(tempDir, cliFileInfo.pkg);

  try {
    await downloadFile(binaryURL, archivePath);
  } catch {
    throw new Error("Could not download elgato-light CLI");
  }

  try {
    const archiveHash = await sha256FileHash(archivePath);

    if (archiveHash !== cliFileInfo.sha256) {
      throw new Error("Hash of elgato-light CLI archive does not match");
    }

    await afs.mkdir(cliDir, { recursive: true });
    await tar.extract({ file: archivePath, filter: (p) => p === "elgato-light", cwd: cliDir });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Hash")) {
      throw error;
    }
    throw new Error("Could not extract downloaded archive of elgato-light CLI");
  } finally {
    await afs.rm(tempDir, { recursive: true });
  }

  try {
    await afs.chmod(cli, "755");
    await afs.writeFile(cliVersionFilePath(), cliVersion);
  } catch {
    await afs.rm(cli, { force: true });
    await afs.rm(cliVersionFilePath(), { force: true });
    throw new Error("Could not chmod elgato-light CLI");
  }

  return cli;
}
