import { environment, showToast } from "@raycast/api";
import axios from "axios";
import fs from "fs";
import afs from "fs/promises";
import path from "path";
import { extract as extractTar } from "tar";
import extractZip from "extract-zip";
import lockfile from "proper-lockfile";
import { showFailureToast } from "@raycast/utils";

// Latest as of 2025-09-17. See: https://github.com/junegunn/fzf/releases
const cliVersion = "0.65.2";
const getCliFileInfo = () => {
  if (process.platform === "win32") {
    // Map Node arch → fzf asset arch
    const arch = process.arch === "arm64" ? "arm64" : "amd64";
    return {
      pkg: `fzf-${cliVersion}-windows_${arch}.zip`,
      name: "fzf.exe",
      extract(file: string, dest: string) {
        return extractZip(file, { dir: dest });
      },
    };
  } else {
    // macOS (darwin). fzf uses amd64/arm64 on Darwin
    const arch = process.arch === "arm64" ? "arm64" : "amd64";
    return {
      pkg: `fzf-${cliVersion}-darwin_${arch}.tar.gz`,
      name: "fzf",
      extract(file: string, dest: string) {
        return extractTar({
          file,
          // tarballs contain a single "fzf" binary; keep only that
          filter: (p) => p.endsWith("/fzf") || p === "fzf",
          cwd: dest,
        });
      },
    };
  }
};

export function fzfCliDirectory(): string {
  return path.join(environment.supportPath, "fzf-cli");
}

export function fzfCliFilepath(): string {
  const cliFileInfo = getCliFileInfo();
  return path.join(fzfCliDirectory(), cliFileInfo.name);
}

export function fzfCliArchive(): string {
  const cliFileInfo = getCliFileInfo();
  return path.join(fzfCliDirectory(), cliFileInfo.pkg);
}

export async function ensureFzfCLI() {
  await afs.mkdir(fzfCliDirectory(), { recursive: true });
  const release = await lockfile.lock(fzfCliDirectory(), { retries: 5 });

  try {
    const cliFileInfo = getCliFileInfo();
    if (fs.existsSync(fzfCliFilepath())) {
      return fzfCliFilepath();
    }

    // Download the CLI
    showToast({
      title: "Downloading",
      message: "fzf cli",
    });
    const binaryURL = `https://github.com/junegunn/fzf/releases/download/v${cliVersion}/${cliFileInfo.pkg}`;
    console.log("downloading fzf archive:", binaryURL);
    const response = await axios.get(binaryURL, { responseType: "stream" });
    const writer = fs.createWriteStream(fzfCliArchive());
    response.data.pipe(writer);

    console.log("waiting for download to finish");
    await new Promise<void>((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
      response.data.on("error", reject);
    });

    console.log("fzf archive downloaded");

    await cliFileInfo.extract(fzfCliArchive(), fzfCliDirectory());
    console.log("fzf executable extracted from the archive");

    await afs.chmod(fzfCliFilepath(), "755");
    console.log("set permissions to fzf executable to 755");

    showToast({
      title: "Success",
      message: "fzf cli installed successfully",
    });
    return fzfCliFilepath();
  } catch (error) {
    showFailureToast(error, { title: "Could not install fzf cli" });
    console.error(`error while downloading fzf cli: ${error}`);
    if (fs.existsSync(fzfCliFilepath())) {
      await afs.rm(fzfCliFilepath());
    }
    throw Error(`error while downloading fzf cli: ${error}`);
  } finally {
    if (fs.existsSync(fzfCliArchive())) {
      await afs.rm(fzfCliArchive());
    }
    await release();
  }
}
