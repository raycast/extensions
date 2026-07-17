/**
 * FFmpeg Static Binary Installer
 *
 * This file is based on and modified from the "ffmpeg-static" npm package
 * Original source: https://github.com/eugeneware/ffmpeg-static
 * License: GPL-3.0
 *
 * Modifications made for Raycast Media Converter extension
 */

import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { pipeline } from "stream";
import { createGunzip } from "zlib";
import axios from "axios";

// Configuration constants
import {
  executableBaseName,
  DOWNLOAD_DIR_ENV_VAR,
  RELEASE_TAG,
  BINARY_PATH_ENV_VAR,
  BINARIES_URL,
} from "./ffmpegInstallConstants";

interface PlatformBinaries {
  [platform: string]: string[];
}

function getBinaryPath(customDownloadDir?: string): string | null {
  if (process.env[BINARY_PATH_ENV_VAR]) {
    return process.env[BINARY_PATH_ENV_VAR];
  }

  const binaries: PlatformBinaries = Object.assign(Object.create(null), {
    darwin: ["x64", "arm64"],
    freebsd: ["x64"],
    linux: ["x64", "ia32", "arm64", "arm"],
    win32: ["x64", "ia32"],
  });

  const platform = process.env.npm_config_platform || os.platform();
  const arch = process.env.npm_config_arch || os.arch();

  let baseDir = __dirname;

  const downloadDir = customDownloadDir || process.env[DOWNLOAD_DIR_ENV_VAR];

  if (downloadDir) {
    baseDir = path.resolve(downloadDir);
  }

  let binaryPath: string | null = path.join(baseDir, executableBaseName + (platform === "win32" ? ".exe" : ""));

  if (!binaries[platform] || binaries[platform].indexOf(arch) === -1) {
    binaryPath = null;
  }

  return binaryPath;
}

type ProgressCallback = (progress: number) => void;

async function installBinary(customDownloadDir?: string, onProgress?: ProgressCallback): Promise<string> {
  // Set the custom download directory in environment if provided
  if (customDownloadDir) {
    process.env[DOWNLOAD_DIR_ENV_VAR] = customDownloadDir;
  }

  const binaryPath = getBinaryPath(customDownloadDir);

  if (!binaryPath) {
    throw new Error("No binary found for this platform/architecture");
  }

  // Check if binary already exists
  if (fs.existsSync(binaryPath)) {
    console.log(`${executableBaseName} is already installed at: ${binaryPath}`);
    return binaryPath;
  }

  // Ensure download directory exists
  const downloadDir = path.dirname(binaryPath);
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  // Download the binary directly
  console.log(`Downloading ${executableBaseName} to ${binaryPath}`);

  const release = process.env.FFMPEG_BINARY_RELEASE || RELEASE_TAG;
  const arch = process.env.npm_config_arch || os.arch();
  const platform = process.env.npm_config_platform || os.platform();
  const downloadsUrl = process.env.FFMPEG_BINARIES_URL || BINARIES_URL;
  const baseUrl = `${downloadsUrl}/${release}`;
  const downloadUrl = `${baseUrl}/${executableBaseName}-${platform}-${arch}.gz`;

  console.log(`Downloading from: ${downloadUrl}`);

  try {
    const response = await axios({
      method: "GET",
      url: downloadUrl,
      responseType: "stream",
      timeout: 30000,
      validateStatus: (status) => status < 400,
    });

    const file = fs.createWriteStream(binaryPath);
    const isGzUrl = downloadUrl.endsWith(".gz");

    // Set up progress tracking
    const contentLength = response.headers["content-length"];
    let downloadedBytes = 0;
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    if (onProgress && totalBytes > 0) {
      onProgress(0); // Start at 0%

      (response.data as NodeJS.ReadableStream).on("data", (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        const progress = Math.round((downloadedBytes / totalBytes) * 100);
        onProgress(progress);
      });
    }

    return new Promise<string>((resolve, reject) => {
      if (isGzUrl) {
        pipeline(response.data as NodeJS.ReadableStream, createGunzip(), file, (err: NodeJS.ErrnoException | null) => {
          if (err) {
            reject(new Error(`Failed to download and extract ${executableBaseName}: ${err.message}`));
          } else {
            // Make it executable
            fs.chmodSync(binaryPath, 0o755);
            console.log(`${executableBaseName} successfully downloaded to: ${binaryPath}`);
            if (onProgress) onProgress(100); // Ensure we end at 100%
            resolve(binaryPath);
          }
        });
      } else {
        pipeline(response.data as NodeJS.ReadableStream, file, (err: NodeJS.ErrnoException | null) => {
          if (err) {
            reject(new Error(`Failed to download ${executableBaseName}: ${err.message}`));
          } else {
            // Make it executable
            fs.chmodSync(binaryPath, 0o755);
            console.log(`${executableBaseName} successfully downloaded to: ${binaryPath}`);
            if (onProgress) onProgress(100); // Ensure we end at 100%
            resolve(binaryPath);
          }
        });
      }
    });
  } catch (error) {
    const err = error as { response?: { status: number }; message?: string };
    throw new Error(
      `Failed to download ${executableBaseName} ${release}. Status: ${err.response?.status || "unknown"}, Message: ${err.message || "unknown error"}`,
    );
  }
}

// Export functions for programmatic use
export { getBinaryPath, installBinary, executableBaseName };

// For backward compatibility, also export the path as a getter function
export const binaryPath = () => getBinaryPath();

// For backward compatibility when used as a direct require
export default getBinaryPath;
