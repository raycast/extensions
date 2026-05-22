#!/usr/bin/env node
/**
 * Copy the ripgrep binary that `@vscode/ripgrep`'s postinstall fetched into
 * the extension's `assets/` directory, so that after `ray build` the binary
 * sits next to the bundled JS (alongside `__dirname`) and can be located at
 * runtime without `require("@vscode/ripgrep").rgPath`.
 *
 * We can't rely on `rgPath` at runtime: Raycast's bundler rewrites
 * `import.meta.url` / `__dirname` inside imported packages, which makes
 * `createRequire` inside `@vscode/ripgrep` crash and pick a non-existent path.
 *
 * `@vscode/ripgrep` >= 1.18 ships per-platform subpackages
 * (`@vscode/ripgrep-<platform>-<arch>/bin/<binary>`). Earlier versions
 * bundled the binary inside the main package (`@vscode/ripgrep/bin/<binary>`).
 * We try the new layout first, then fall back.
 */

const fs = require("fs");
const path = require("path");

const binaryName = process.platform === "win32" ? "rg.exe" : "rg";

const candidates = [
  `@vscode/ripgrep-${process.platform}-${process.arch}/bin/${binaryName}`,
  `@vscode/ripgrep/bin/${binaryName}`,
];

let sourcePath;
for (const candidate of candidates) {
  try {
    sourcePath = require.resolve(candidate);
    break;
  } catch {
    // try next
  }
}

if (!sourcePath) {
  console.error(`Could not locate ripgrep binary for ${process.platform}-${process.arch}.`);
  console.error(`Tried: ${candidates.join(", ")}`);
  console.error("Run `npm install` first — @vscode/ripgrep's postinstall hook downloads the binary.");
  process.exit(1);
}

const assetsDir = path.join(__dirname, "..", "assets");
const destinationPath = path.join(assetsDir, binaryName);

fs.mkdirSync(assetsDir, { recursive: true });
fs.copyFileSync(sourcePath, destinationPath);

if (process.platform !== "win32") {
  fs.chmodSync(destinationPath, 0o755);
}

console.log(`Copied ripgrep binary to assets/${binaryName}`);
