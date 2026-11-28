#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

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

if (process.platform === "darwin") {
  const source = path.join(__dirname, "..", "node_modules", "@spotxyz", "macos-audio-devices", "audio-devices");
  const dest = path.join(assetsDir, "audio-devices");
  copyBinary(source, dest);
} else {
  console.log("Skipping binary copy (macOS only)");
}
