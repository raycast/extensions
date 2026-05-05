#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const source = path.join(__dirname, "..", "node_modules", "@spotxyz", "macos-audio-devices", "audio-devices");
const destination = path.join(__dirname, "..", "assets", "audio-devices");

if (process.platform !== "darwin") {
  console.log("Skipping macOS audio helper copy on non-macOS platform");
  process.exit(0);
}

if (!fs.existsSync(source)) {
  console.error(`Audio helper binary not found at ${source}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(source, destination);
fs.chmodSync(destination, 0o755);
console.log("Copied audio-devices binary to assets/");
