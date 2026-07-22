const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function getRayCliEntrypoint() {
  const runJs = path.join(root, "node_modules", "@raycast", "api", "bin", "run.js");
  if (fs.existsSync(runJs)) {
    return runJs;
  }

  return null;
}

function runRayVersionCheck() {
  const runJs = getRayCliEntrypoint();
  if (!runJs) {
    return { status: 1, stderr: "Missing @raycast/api Raycast CLI entrypoint." };
  }

  // Node 24 on Windows rejects spawnSync on .cmd shims (EINVAL). Invoke run.js directly.
  return spawnSync(process.execPath, [runJs, "--version"], {
    cwd: root,
    encoding: "utf8",
  });
}

const nodeVersion = process.versions.node;
const [major, minor, patch] = nodeVersion.split(".").map(Number);
const meetsNodeRequirement =
  major > 22 || (major === 22 && (minor > 14 || (minor === 14 && patch >= 0)));

if (!meetsNodeRequirement) {
  console.error(`QuickShell Raycast requires Node.js >= 22.14.0 (current: ${nodeVersion}).`);
  console.error("Install Node 22.14+ from https://nodejs.org/ and rerun npm install.");
  process.exit(1);
}

const result = runRayVersionCheck();

if (result.status !== 0) {
  console.error("Raycast CLI is unavailable or incomplete.");
  if (result.stderr?.trim()) {
    console.error(result.stderr.trim());
  }
  if (result.stdout?.trim()) {
    console.error(result.stdout.trim());
  }
  console.error("");
  console.error("Repair steps (PowerShell):");
  console.error("  cd QuickShell.Raycast");
  console.error("  Remove-Item -Recurse -Force node_modules");
  console.error("  Remove-Item -Force package-lock.json");
  console.error("  npm install");
  console.error("  npm run dev");
  process.exit(1);
}
