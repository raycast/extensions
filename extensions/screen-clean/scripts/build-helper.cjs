const { spawnSync } = require("node:child_process");
const { copyFileSync, mkdirSync } = require("node:fs");
const { join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const assets = join(root, "assets");
const windowsSource = join(root, "native", "windows", "ScreenCleaner.ps1");
const windowsAsset = join(assets, "ScreenCleaner.ps1");

mkdirSync(assets, { recursive: true });
copyFileSync(windowsSource, windowsAsset);
console.log("Copied Windows helper to assets/ScreenCleaner.ps1");

if (process.platform === "darwin") {
  const result = spawnSync("bash", [join(root, "native", "build.sh")], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
} else {
  console.log("Skipping macOS helper build (not running on macOS).");
}
