const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const raycastRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(raycastRoot, "..");
const assetPath = path.join(raycastRoot, "assets", "QuickShell.Suggest.exe");
const buildScript = path.join(repoRoot, "scripts", "build-raycast-suggest.ps1");

const ifMissing = process.argv.includes("--if-missing");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (process.platform !== "win32") {
  process.exit(0);
}

if (ifMissing && fs.existsSync(assetPath)) {
  process.exit(0);
}

if (!fs.existsSync(buildScript)) {
  // Store PR / raycast/extensions layout has no QuickShell.Suggest packaging scripts.
  // Skip quietly so CI can lint/build; Windows falls back to local heuristics without the asset.
  console.warn(
    `QuickShell.Suggest build script not found at ${buildScript}; skipping Suggest.exe publish.`,
  );
  process.exit(0);
}

const result = spawnSync(
  "powershell.exe",
  ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", buildScript, "-ProjectRoot", repoRoot],
  {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "inherit",
  },
);

if (result.error) {
  fail(`Failed to publish QuickShell.Suggest.exe: ${result.error.message}`);
}

if (result.status !== 0) {
  fail(`QuickShell.Suggest publish failed with exit code ${result.status ?? 1}`);
}

if (!fs.existsSync(assetPath)) {
  fail(`QuickShell.Suggest.exe was not published to ${assetPath}`);
}
