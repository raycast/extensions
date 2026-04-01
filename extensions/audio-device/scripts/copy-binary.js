#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");

const assetsDir = path.join(__dirname, "..", "assets");

function ensureAssetsDir() {
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
}

function verifyChecksum(filePath, expectedChecksum) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("error", (error) => reject(error));
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => {
      const actualChecksum = hash.digest("hex");
      if (actualChecksum.toLowerCase() === expectedChecksum.toLowerCase()) {
        resolve(true);
      } else {
        reject(new Error(`Checksum mismatch. Expected: ${expectedChecksum}, Got: ${actualChecksum}`));
      }
    });
  });
}

function copyBinary(source, dest) {
  ensureAssetsDir();

  if (!fs.existsSync(source)) {
    console.error("Source binary not found:", source);
    process.exit(1);
  }

  fs.copyFileSync(source, dest);
  console.log(`Copied ${path.basename(dest)} binary to assets/`);
}

function downloadBinary(url, dest, redirectCount = 0) {
  ensureAssetsDir();

  if (redirectCount > 5) {
    return Promise.reject(new Error("Too many redirects"));
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = https.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlink(dest, () => {
          const location = response.headers.location;
          if (!location.startsWith("https://")) {
            reject(new Error(`Redirect to non-HTTPS URL is not allowed: ${location}`));
            return;
          }
          resolve(downloadBinary(location, dest, redirectCount + 1));
        });
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {
          reject(new Error(`Download failed with status ${response.statusCode}`));
        });
        return;
      }

      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
    });

    request.on("error", (error) => {
      file.close();
      fs.unlink(dest, () => {
        reject(error);
      });
    });
  });
}

if (process.platform === "darwin") {
  const source = path.join(__dirname, "..", "node_modules", "@spotxyz", "macos-audio-devices", "audio-devices");
  const dest = path.join(assetsDir, "audio-devices");
  copyBinary(source, dest);
} else if (process.platform === "win32") {
  console.log("Skipping Windows binary download - will be downloaded at runtime");
} else {
  console.log("Skipping binary copy (unsupported platform)");
}
