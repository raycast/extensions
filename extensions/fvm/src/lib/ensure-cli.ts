import axios from "axios";
import { pipeline } from "stream";
import tar from "tar";

import { environment } from "@raycast/api";
import fs from "fs";
import afs from "fs/promises";
import * as os from "os";
import path from "path";
import { promisify } from "util";
import { AsyncLock } from "./utils";

const kCliDir = path.join(environment.supportPath, "cli");

const kCLIFilePath = path.join(kCliDir, "fvm");

const getFvmExecPath = path.join(kCLIFilePath, "fvm");

const kTempDirectory = path.join(environment.supportPath, ".tmp");

const kCliVersionFilePath = path.join(environment.supportPath, ".cli_version");

const kCliLastUpdateCheckFilePath = path.join(environment.supportPath, ".last_update_check");
const kTempFileName = "fvm.tar.gz";

const pipelineAsync = promisify(pipeline);

function getDownloadUrl(os: string, arch: string, version: string) {
  return `https://github.com/leoafarias/fvm/releases/download/${version}/fvm-${version}-${os}-${arch}.tar.gz`;
}

const download = async (url: string, dest: string, options: { filename: string }) => {
  try {
    // Axios GET request to the URL, response type set to 'stream' for downloading
    const response = await axios.get(url, { responseType: "stream" });

    // Ensure the destination directory exists
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true });
    }
    fs.mkdirSync(dest, { recursive: true });

    const writePath = path.join(dest, options.filename);

    // Use stream pipeline to save the file
    await pipelineAsync(response.data, fs.createWriteStream(writePath));

    console.log(`File downloaded successfully to ${path}`);
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
};

async function getLatestRelease(): Promise<string> {
  try {
    const response = await axios.get("https://api.github.com/repos/leoafarias/fvm/releases/latest");
    return response.data.tag_name;
  } catch (error) {
    // In case there is a github api limit from the IP
    const response = await axios.get("https://pub.dev/api/packages/fvm");
    return response.data.latest.version;
  }
}

const ensureCliLock = new AsyncLock();

let hasCheckedForUpdate = false;

export async function ensureCLI(): Promise<string> {
  await ensureCliLock.acquire();
  console.debug("Ensuring CLI");

  try {
    if (fs.existsSync(getFvmExecPath) && fs.existsSync(kCliVersionFilePath)) {
      // Avoid checking multiple times in the same run
      if (hasCheckedForUpdate) return getFvmExecPath;
      if (fs.existsSync(kCliLastUpdateCheckFilePath)) {
        const lastCheckTime = (await afs.stat(kCliLastUpdateCheckFilePath)).mtimeMs;
        const currentTime = Date.now();
        const sixtyMinutesInMilliseconds = 60 * 60 * 1000;

        if (currentTime - lastCheckTime < sixtyMinutesInMilliseconds) {
          console.debug("Skipping update check. Last check was within 2 days.");

          return getFvmExecPath;
        }
      }

      await afs.writeFile(kCliLastUpdateCheckFilePath, new Date().toISOString());

      const version = await afs.readFile(kCliVersionFilePath, "utf-8");
      const latestVersion = await getLatestRelease();
      if (version === latestVersion) {
        console.debug("CLI is up to date");
        return getFvmExecPath;
      }
    }

    const latestVersion = await getLatestRelease();
    const info = getPlatformInfo();
    console.debug(`Latest version of fvm is ${latestVersion}`);
    const binaryURL = getDownloadUrl(info.os, info.arch, latestVersion);

    console.debug(`Downloading client at ${binaryURL}`);

    await download(binaryURL, kTempDirectory, { filename: kTempFileName });

    console.debug("Downloaded");

    const archive = path.join(kTempDirectory, kTempFileName);

    console.debug("Archive:", archive);
    console.debug("Exists:", fs.existsSync(archive));

    await extractTarGz(archive, kCliDir);

    await afs.rm(kTempDirectory, { recursive: true });

    await afs.chmod(kCLIFilePath, "755");

    await afs.writeFile(kCliVersionFilePath, latestVersion);

    // Update the last check file
    await afs.writeFile(kCliLastUpdateCheckFilePath, "");
    return getFvmExecPath;
  } catch (error) {
    afs.rm(getFvmExecPath, { recursive: true });
    console.error("Error ensuring CLI:", error);
    throw error;
  } finally {
    if (fs.existsSync(kTempDirectory)) {
      await afs.rm(kTempDirectory, { recursive: true });
    }
    hasCheckedForUpdate = true;
    ensureCliLock.release();
  }
}

const extractTarGz = async (tarGzPath: string, dest: string) => {
  try {
    // Ensure the destination directory exists
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true });
    }

    console.log(`Creating directory ${dest}`);
    await afs.mkdir(dest, { recursive: true });

    // Extract the .tar.gz file
    await tar.x({
      file: tarGzPath,
      C: dest,
    });

    console.log(`Extracted ${tarGzPath} to ${dest}`);
  } catch (error) {
    console.error("Error extracting tar.gz:", error);
    throw error;
  }
};

interface PlatformInfo {
  os: string;
  arch: string;
}

const getPlatformInfo = (): PlatformInfo => {
  let mappedOS: string;
  let mappedArch: string;

  // Detecting OS
  switch (os.platform()) {
    case "darwin":
      mappedOS = "macos";
      break;
    case "linux":
      mappedOS = "linux";
      break;
    case "win32":
      mappedOS = "windows";
      break;
    default:
      throw new Error("Unsupported OS");
  }

  // Detecting Architecture
  switch (os.arch()) {
    case "x64":
      mappedArch = "x64";
      break;
    case "arm64":
      mappedArch = "arm64";
      break;
    case "arm":
      mappedArch = "arm";
      break;
    default:
      throw new Error("Unsupported architecture");
  }

  return { os: mappedOS, arch: mappedArch };
};

try {
  const { os, arch } = getPlatformInfo();
  console.log(`Detected OS: ${os}, Detected Architecture: ${arch}`);
  // Proceed with other operations using detected os and arch
} catch (error) {
  console.error(error);
  process.exit(1);
}
