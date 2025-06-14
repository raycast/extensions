"use strict";

// Configuration constants
import {
  executableBaseName,
  DOWNLOAD_DIR_ENV_VAR,
  RELEASE_TAG,
  BINARY_PATH_ENV_VAR,
  BINARIES_URL,
} from "./ffmpegInstallConstants.ts";

function getBinaryPath(customDownloadDir) {
  if (process.env[BINARY_PATH_ENV_VAR]) {
    return process.env[BINARY_PATH_ENV_VAR];
  }

  var os = require("os");
  var path = require("path");

  var binaries = Object.assign(Object.create(null), {
    darwin: ["x64", "arm64"],
    freebsd: ["x64"],
    linux: ["x64", "ia32", "arm64", "arm"],
    win32: ["x64", "ia32"],
  });

  var platform = process.env.npm_config_platform || os.platform();
  var arch = process.env.npm_config_arch || os.arch();

  let baseDir = __dirname;

  const downloadDir = customDownloadDir || process.env[DOWNLOAD_DIR_ENV_VAR];

  if (downloadDir) {
    baseDir = path.resolve(downloadDir);
  }

  let binaryPath = path.join(baseDir, executableBaseName + (platform === "win32" ? ".exe" : ""));

  if (!binaries[platform] || binaries[platform].indexOf(arch) === -1) {
    binaryPath = null;
  }

  return binaryPath;
}

async function installBinary(customDownloadDir) {
  const fs = require("fs");
  const path = require("path");
  const os = require("os");
  const request = require("@derhuerst/http-basic");
  const { createGunzip } = require("zlib");
  const { pipeline } = require("stream");

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

  return new Promise((resolve, reject) => {
    request(
      "GET",
      downloadUrl,
      {
        followRedirects: true,
        maxRedirects: 3,
        timeout: 30 * 1000, // 30s
        retry: true,
      },
      (err, response) => {
        if (err || response.statusCode !== 200) {
          const error =
            err || new Error(`Failed to download ${executableBaseName} ${release}. Status: ${response.statusCode}`);
          if (response) {
            error.url = response.url;
            error.statusCode = response.statusCode;
          }
          reject(error);
          return;
        }

        const file = fs.createWriteStream(binaryPath);
        const isGzUrl = downloadUrl.endsWith(".gz");

        const streams = isGzUrl ? [response.body, createGunzip(), file] : [response.body, file];

        pipeline(...streams, (err) => {
          if (err) {
            err.url = response.url;
            err.statusCode = response.statusCode;
            reject(err);
          } else {
            // Make it executable
            fs.chmodSync(binaryPath, 0o755);
            console.log(`${executableBaseName} successfully downloaded to: ${binaryPath}`);
            resolve(binaryPath);
          }
        });
      },
    );
  });
}

// Export functions for programmatic use
module.exports = {
  getBinaryPath,
  installBinary,
  executableBaseName,
  // For backward compatibility, also export the path directly
  path: getBinaryPath(),
};

// For backward compatibility when used as a direct require
module.exports.default = getBinaryPath();
