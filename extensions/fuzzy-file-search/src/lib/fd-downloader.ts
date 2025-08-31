import { environment } from "@raycast/api";
import axios from "axios";
import fs from "fs";
import afs, { FileHandle } from "fs/promises";
import path from "path";
import { extract as extractTar } from "tar";
import extractZip from "extract-zip";

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

export function fdCLIDirectory(): string {
  return path.join(environment.supportPath, "fd-cli");
}

export function fdCLIFilepath(): string {
  const cliFileInfo = getCliFileInfo();
  return path.join(fdCLIDirectory(), cliFileInfo.name);
}

// Does the following:
// 1. Checks if the executable with correct hash exists, if so, return it
// 2. Checks if archive exists
// - Downloads the archive as archive.tar
// - Renames the archive.tar to archive
// - Extracts the executable
// - Removes the archive
export async function ensureFdCLI() {
  const cliFileInfo = getCliFileInfo();
  const cli = fdCLIFilepath();

  if (fs.existsSync(cli)) {
    // TODO: check for the hash
    return cli;
  }
  // Download the cli
  const binaryURL = `https://github.com/sharkdp/fd/releases/download/v${cliVersion}/${cliFileInfo.pkg}`;
  const dir = path.join(environment.supportPath, "fd-cli");
  await afs.mkdir(dir, { recursive: true });
  const archivePath = path.join(dir, cliFileInfo.pkg);

  let archiveFile: FileHandle;
  try {
    archiveFile = await afs.open(archivePath, "wx");
  } catch (err) {
    // This weird syntax is needed to pass the linter
    // "any" is not allowed, even in catch statements where only any or undefined is allowed
    if ((err as { code?: string }).code === "EEXIST") {
      console.warn(`Couldn't open an archive file for download as it is opened somewhere else: ${err}`);
    }
    throw err;
  }

  try {
    console.log("downloading archive");
    const response = await axios.get(binaryURL, { responseType: "stream" });
    const writer = fs.createWriteStream(archivePath);

    response.data.pipe(writer);

    console.log("waiting for download finish");
    await new Promise((resolve, reject) => {
      response.data.on("end", resolve);
      response.data.on("error", reject);
    });

    console.log("fd archive downloaded");

    await cliFileInfo.extract(archivePath, dir);
    console.log("fd executable extracted from the archive");

    await afs.chmod(cli, "755");
    console.log("set permissions to fd executable to 755");
  } catch (error) {
    if (fs.existsSync(cli)) {
      await afs.rm(cli);
    }

    console.error(`Could not download fd cli: ${error}`);
    throw Error(`Could not download fd cli: ${error}`);
  } finally {
    if (fs.existsSync(archivePath)) {
      await afs.rm(archivePath);
    }
    await archiveFile?.close();
  }

  return cli;
}
