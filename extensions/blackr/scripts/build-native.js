const { existsSync } = require("node:fs");
const { chmodSync, rmSync } = require("node:fs");
const { join } = require("node:path");
const { execFileSync } = require("node:child_process");

const rootPath = join(__dirname, "..");
const assetsPath = join(rootPath, "assets");
const swiftSourcePath = join(rootPath, "native", "BlackrOverlay.swift");
const macOSArm64Path = join(assetsPath, "blackr-overlay-arm64");
const macOSX64Path = join(assetsPath, "blackr-overlay-x64");
const macOSOverlayPath = join(assetsPath, "blackr-overlay");
const windowsOverlayPath = join(assetsPath, "blackr-overlay.ps1");

if (process.platform === "darwin") {
  buildMacOSOverlay();
} else if (process.platform === "win32") {
  validateWindowsOverlay();
} else {
  validateWindowsOverlay();
  console.log(`Skipping native overlay compilation on unsupported build platform: ${process.platform}`);
}

function buildMacOSOverlay() {
  execFileSync("swiftc", [
    swiftSourcePath,
    "-O",
    "-target",
    "arm64-apple-macos12",
    "-o",
    macOSArm64Path,
  ], { stdio: "inherit" });

  execFileSync("swiftc", [
    swiftSourcePath,
    "-O",
    "-target",
    "x86_64-apple-macos12",
    "-o",
    macOSX64Path,
  ], { stdio: "inherit" });

  execFileSync("lipo", [
    "-create",
    macOSArm64Path,
    macOSX64Path,
    "-output",
    macOSOverlayPath,
  ], { stdio: "inherit" });

  rmSync(macOSArm64Path, { force: true });
  rmSync(macOSX64Path, { force: true });
  chmodSync(macOSOverlayPath, 0o755);
}

function validateWindowsOverlay() {
  if (!existsSync(windowsOverlayPath)) {
    throw new Error(`Missing Windows overlay script: ${windowsOverlayPath}`);
  }
}
