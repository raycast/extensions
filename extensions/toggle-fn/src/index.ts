import { closeMainWindow, environment, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import fetch from "node-fetch";
import * as path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const EXPECTED_SHA1 = "83a10e07be09af45058e25fecee5e0a4066ac2b2";
const DOWNLOAD_URL = "https://github.com/CaramelFur/fntoggle/releases/download/v20250715-145707-396345c/fntoggle.zip";

function calculateSHA1(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha1");
    const stream = fs.createReadStream(filePath);

    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function downloadFile(url: string, destinationPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(destinationPath, Buffer.from(arrayBuffer));
}

async function extractZip(zipPath: string, extractPath: string): Promise<void> {
  const safePath = path.resolve(extractPath);
  const safeZipPath = path.resolve(zipPath);

  await execFileAsync("unzip", ["-o", safeZipPath, "-d", safePath]);
}

async function downloadAndExtractFntoggle(toast?: Toast): Promise<void> {
  if (!fs.existsSync(environment.supportPath)) {
    fs.mkdirSync(environment.supportPath, { recursive: true });
  }

  const zipPath = path.join(environment.supportPath, "fntoggle.zip");
  await downloadFile(DOWNLOAD_URL, zipPath);

  if (toast) {
    toast.title = "Extracting fntoggle...";
  }
  await extractZip(zipPath, environment.supportPath);

  fs.unlinkSync(zipPath);

  const fntogglePath = path.join(environment.supportPath, "fntoggle");
  fs.chmodSync(fntogglePath, 0o755);
}

export default async function () {
  try {
    const fntogglePath = path.join(environment.supportPath, "fntoggle");
    let justDownloaded = false;

    if (!fs.existsSync(fntogglePath)) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Downloading fntoggle...",
      });

      await downloadAndExtractFntoggle(toast);
      justDownloaded = true;
    }

    let actualSHA1 = await calculateSHA1(fntogglePath);
    if (actualSHA1 !== EXPECTED_SHA1) {
      if (!justDownloaded) {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Redownloading fntoggle...",
        });

        fs.unlinkSync(fntogglePath);
        await downloadAndExtractFntoggle(toast);

        actualSHA1 = await calculateSHA1(fntogglePath);
        if (actualSHA1 !== EXPECTED_SHA1) {
          await showFailureToast(new Error("fntoggle executable checksum mismatch after redownload"), {
            title: "Security Error",
          });
          return;
        }
      } else {
        await showFailureToast(new Error("fntoggle executable checksum mismatch"), {
          title: "Security Error",
        });
        return;
      }
    }

    await closeMainWindow({ clearRootSearch: true });

    await execFileAsync(fntogglePath, []);

    await showToast({
      style: Toast.Style.Success,
      title: "Function keys toggled",
    });
  } catch (error) {
    console.error("Failed to execute fntoggle:", error);
    await showFailureToast(error, { title: "Failed to toggle function keys" });
  }
}
