import { createWriteStream, existsSync, mkdirSync, chmodSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { createHash } from "crypto";
import { get } from "https";
import { showToast, Toast } from "@raycast/api";

const BINARY_VERSION = "v0.0.1";
const BINARY_SHA256 = "7a110a299ae4f92719cea16af8bbbd62c19a77007d3b9cac971c13f82e2adcba";
const DOWNLOAD_URL = `https://github.com/detailobsessed/better-contacts-helper/releases/download/${BINARY_VERSION}/contacts-helper`;

// Singleton promise to prevent concurrent downloads
let downloadPromise: Promise<string> | null = null;

function getBinaryDir(): string {
  return join(homedir(), "Library/Application Support/better-contacts/bin");
}

function getBinaryPath(): string {
  return join(getBinaryDir(), "contacts-helper");
}

function getVersionPath(): string {
  return join(getBinaryDir(), "version");
}

function verifyChecksum(filePath: string): boolean {
  const fileBuffer = readFileSync(filePath);
  const hash = createHash("sha256").update(fileBuffer).digest("hex");
  return hash === BINARY_SHA256;
}

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);

    const request = (currentUrl: string) => {
      get(currentUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            request(redirectUrl);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      }).on("error", (err) => {
        unlinkSync(destPath);
        reject(err);
      });
    };

    request(url);
  });
}

async function doDownload(): Promise<string> {
  const binaryPath = getBinaryPath();
  const versionPath = getVersionPath();
  const binaryDir = getBinaryDir();

  // Check if binary exists and is correct version
  if (existsSync(binaryPath) && existsSync(versionPath)) {
    const installedVersion = readFileSync(versionPath, "utf-8").trim();
    if (installedVersion === BINARY_VERSION && verifyChecksum(binaryPath)) {
      return binaryPath;
    }
  }

  // Need to download
  await showToast({
    style: Toast.Style.Animated,
    title: "Setting up Better Contacts...",
    message: "Downloading helper (one-time only)",
  });

  // Create directory
  mkdirSync(binaryDir, { recursive: true });

  // Download binary
  const tempPath = join(binaryDir, "contacts-helper.tmp");
  try {
    await downloadFile(DOWNLOAD_URL, tempPath);

    // Verify checksum
    if (!verifyChecksum(tempPath)) {
      unlinkSync(tempPath);
      throw new Error("Checksum verification failed");
    }

    // Move to final location
    if (existsSync(binaryPath)) {
      unlinkSync(binaryPath);
    }
    const { renameSync } = await import("fs");
    renameSync(tempPath, binaryPath);

    // Make executable
    chmodSync(binaryPath, 0o755);

    // Write version file
    const { writeFileSync } = await import("fs");
    writeFileSync(versionPath, BINARY_VERSION);

    await showToast({
      style: Toast.Style.Success,
      title: "Setup complete",
    });

    return binaryPath;
  } catch (error) {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
    await showToast({
      style: Toast.Style.Failure,
      title: "Download failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function ensureBinary(): Promise<string> {
  // Return existing promise if download is in progress (prevents race condition)
  if (downloadPromise) {
    return downloadPromise;
  }

  downloadPromise = doDownload();
  try {
    return await downloadPromise;
  } finally {
    downloadPromise = null;
  }
}

export function getBinaryPathSync(): string | null {
  const binaryPath = getBinaryPath();
  const versionPath = getVersionPath();

  if (existsSync(binaryPath) && existsSync(versionPath)) {
    const installedVersion = readFileSync(versionPath, "utf-8").trim();
    if (installedVersion === BINARY_VERSION) {
      return binaryPath;
    }
  }
  return null;
}
