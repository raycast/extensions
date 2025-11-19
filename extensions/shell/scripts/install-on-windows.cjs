#!/usr/bin/env node
const fs = require("fs"); // eslint-disable-line @typescript-eslint/no-var-requires
const os = require("os"); // eslint-disable-line @typescript-eslint/no-var-requires
const path = require("path"); // eslint-disable-line @typescript-eslint/no-var-requires

if (process.platform !== "win32") {
  console.log("[install-windows] Skipping copy because the host OS is not Windows.");
  process.exit(0);
}

const extensionName = "shell";
const home = os.homedir();
const joinPath = (...segments) => path.join(...segments.filter(Boolean));
const distDir = path.resolve(__dirname, "..", "dist");
const cliDir = joinPath(home, ".config", "raycast", "extensions", extensionName);
const raycastXDir = joinPath(home, ".config", "raycast-x", "extensions", extensionName);

const sourceDir = fs.existsSync(cliDir) ? cliDir : distDir;

if (!fs.existsSync(sourceDir)) {
  console.error(
    `[install-windows] Build output not found. Expected files in "${cliDir}" or "${distDir}". Run "bunx ray build -e dist -o dist" first.`
  );
  process.exit(1);
}

fs.mkdirSync(path.dirname(raycastXDir), { recursive: true });
fs.rmSync(raycastXDir, { recursive: true, force: true });
fs.cpSync(sourceDir, raycastXDir, { recursive: true });

console.log(`[install-windows] Copied extension from "${sourceDir}" to "${raycastXDir}".`);
