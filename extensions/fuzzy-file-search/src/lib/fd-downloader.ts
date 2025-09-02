import { environment } from "@raycast/api";
import axios from "axios";
import fs from "fs";
import afs from "fs/promises";
import path from "path";
import { extract as extractTar } from "tar";
import extractZip from "extract-zip";
import lockfile from "proper-lockfile";

const cliVersion = "10.3.0";
const getCliFileInfo = () => {
  if (process.platform === "win32") {
    return {
      pkg: `fd-v${cliVersion}-x86_64-pc-windows-msvc.zip`,
      name: "fd.exe",
      extract(file: string, dest: string) {
        return extractZip(file, { dir: dest });
      },
    };
  } else {
    // Detect macOS architecture
    const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
    return {
      pkg: `fd-v${cliVersion}-${arch}-apple-darwin.tar.gz`,
      name: "fd",
      extract(file: string, dest: string) {
        return extractTar({
          file,
          filter: (p) => p.endsWith("/fd") || p === "fd",
          cwd: dest,
          strip: 1,
        });
      },
    };
  }
};

export function fdCliDirectory(): string {
  return path.join(environment.supportPath, "fd-cli");
}

export function fdCliFilepath(): string {
  const cliFileInfo = getCliFileInfo();
  return path.join(fdCliDirectory(), cliFileInfo.name);
}

export function fdCliArchive(): string {
  const cliFileInfo = getCliFileInfo();
  return path.join(fdCliDirectory(), cliFileInfo.pkg);
}

// Does the following:
// 1. Checks if the executable with correct hash exists, if so, return it
// 2. Checks if archive exists
// - Downloads the archive as archive.tar
// - Renames the archive.tar to archive
// - Extracts the executable
// - Removes the archive
export async function ensureFdCLI() {
  await afs.mkdir(fdCliDirectory(), { recursive: true });
  const release = await lockfile.lock(fdCliDirectory(), {
    retries: 10,
  });

  try {
    const cliFileInfo = getCliFileInfo();
    if (fs.existsSync(fdCliFilepath())) {
      // TODO: check for the hash
      console.log("already downloaded fd cli found");
      return fdCliFilepath();
    }

    // Download the cli
    const binaryURL = `https://github.com/sharkdp/fd/releases/download/v${cliVersion}/${cliFileInfo.pkg}`;
    console.log("downloading archive");
    const response = await axios.get(binaryURL, { responseType: "stream" });
    const writer = fs.createWriteStream(fdCliArchive());

    response.data.pipe(writer);

    console.log("waiting for download finish");
    await new Promise((resolve, reject) => {
      response.data.on("end", resolve);
      response.data.on("error", reject);
    });

    console.log("fd archive downloaded");

    await cliFileInfo.extract(fdCliArchive(), fdCliDirectory());
    console.log("fd executable extracted from the archive");

    await afs.chmod(fdCliFilepath(), "755");
    console.log("set permissions to fd executable to 755");
    return fdCliFilepath();
  } catch (error) {
    console.error(`Could not download fd cli: ${error}`);
    if (fs.existsSync(fdCliFilepath())) {
      await afs.rm(fdCliFilepath());
    }
    throw Error(`Could not download fd cli: ${error}`);
  } finally {
    if (fs.existsSync(fdCliArchive())) {
      await afs.rm(fdCliArchive());
    }
    await release();
  }
}
