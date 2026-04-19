/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

// Only win32_x64 and win32_arm64 are supported — 32-bit (win32_ia32) is not supported.
const koffiTargets = ["win32_x64", "win32_arm64"];


const root = path.resolve(__dirname, "..");
const assetsDir = path.join(root, "assets");
const nativeAssetsDir = path.join(assetsDir, "native");
const koffiAssetsDir = path.join(nativeAssetsDir, "koffi");
const koffiModulesDir = path.join(root, "node_modules", "koffi", "build", "koffi");


/**
 * Copies koffi.node prebuilt binaries from node_modules into assets/native/koffi.
 */
function copyKoffiBindings() {
  if (!fs.existsSync(path.join(root, "node_modules"))) {
    console.error("Error: node_modules not found. Please run `npm install` first, then re-run this script.");
    process.exit(1);
  }

  if (!fs.existsSync(koffiModulesDir)) {
    console.error("Error: koffi build directory not found at node_modules/koffi/build/koffi.");
    console.error("Run `npm install` to ensure koffi is installed, then re-run this script.");
    process.exit(1);
  }

  for (const target of koffiTargets) {
    const src = path.join(koffiModulesDir, target, "koffi.node");
    const destDir = path.join(koffiAssetsDir, target);
    const dest = path.join(destDir, "koffi.node");

    if (!fs.existsSync(src)) {
      console.warn(`  Warning: ${path.relative(root, src)} not found, skipping.`);
      continue;
    }

    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`  Copied koffi.node → ${path.relative(root, dest)}`);
  }
}


async function run() {
  console.log("=== Copying koffi.node bindings ===");
  copyKoffiBindings();
  console.log("\nDone. Native binaries are up to date.");
}

run().catch((error) => {
  console.error("Failed to fetch native binaries.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});