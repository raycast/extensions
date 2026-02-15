#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const https = require("https");

const assetsDir = path.join(__dirname, "..", "assets");

function ensureAssetsDir() {
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
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
          resolve(downloadBinary(response.headers.location, dest, redirectCount + 1));
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
  const url = "https://github.com/Inovvia/go-win-audio-cli/releases/download/1.0.0/win-audio-cli.exe";
  const dest = path.join(assetsDir, "win-audio-cli.exe");
  downloadBinary(url, dest)
    .then(() => {
      console.log("Downloaded win-audio-cli.exe to assets/.");
    })
    .catch((error) => {
      console.error("Failed to download Windows audio binary:", error.message);
      process.exit(1);
    });
} else {
  console.log("Skipping binary copy (unsupported platform)");
}
