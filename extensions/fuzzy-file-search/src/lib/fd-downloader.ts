import { environment, showToast, Toast } from "@raycast/api";
import axios from "axios";
import fs from "fs";
import afs from "fs/promises";
import path from "path";
import { extract as extractTar } from "tar";
import extractZip from "extract-zip";
import lockfile from "proper-lockfile";
import { showFailureToast } from "@raycast/utils";

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

export async function ensureFdCLI() {
  await afs.mkdir(fdCliDirectory(), { recursive: true });
  const release = await lockfile.lock(fdCliDirectory(), {
    retries: 5,
  });

  try {
    // Create ignore file (including ~/Library/ directory takes too much resources)
    const homePath = process.env.HOME;
    if (homePath === undefined) {
      await release();
      throw new Error("$HOME environmental variable undefined");
    }
    const ignoreFile = path.join(homePath, ".fdignore");
    // Don't create ignore file if one already exists
    if (!fs.existsSync(ignoreFile)) {
      console.log("creating default ~/.fdignore file");
      await afs.writeFile(ignoreFile, "Library/\n**.photoslibrary\n");
    }

    const cliFileInfo = getCliFileInfo();
    if (fs.existsSync(fdCliFilepath())) {
      return fdCliFilepath();
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading",
      message: "installing fd cli",
    });
    // Download the cli
    const binaryURL = `https://github.com/sharkdp/fd/releases/download/v${cliVersion}/${cliFileInfo.pkg}`;
    console.log("downloading archive");
    const response = await axios.get(binaryURL, { responseType: "stream" });
    const writer = fs.createWriteStream(fdCliArchive());
    response.data.pipe(writer);
    console.log("waiting for download finish");
    await new Promise((resolve, reject) => {
      writer.on("finish", () => resolve("done"));
      writer.on("error", reject);
      response.data.on("error", reject);
    });

    console.log("fd archive downloaded");

    await cliFileInfo.extract(fdCliArchive(), fdCliDirectory());
    console.log("fd executable extracted from the archive");

    await afs.chmod(fdCliFilepath(), "755");
    console.log("set permissions to fd executable to 755");

    toast.style = Toast.Style.Success;
    toast.message = "fd cli installed successfully";

    return fdCliFilepath();
  } catch (error) {
    showFailureToast(error, { title: "Could not install fd cli" });
    console.error(`error while downloading fd cli: ${error}`);
    if (fs.existsSync(fdCliFilepath())) {
      await afs.rm(fdCliFilepath());
    }
    throw Error(`error while downloading fd cli: ${error}`);
  } finally {
    if (fs.existsSync(fdCliArchive())) {
      await afs.rm(fdCliArchive());
    }
    await release();
  }
}
