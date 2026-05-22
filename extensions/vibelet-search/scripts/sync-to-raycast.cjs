#!/usr/bin/env node
//
// Dev helper: copy the freshly-built dist/ into every Raycast install that
// already has Vibelet Search imported. Detects Stable, Beta, and any other
// Raycast variant by scanning ~/.config/raycast*/extensions/<extName>/.
//
// This is purely a local developer convenience for when you don't want to
// keep `ray develop` running in a foreground terminal. End users install
// via Raycast Store (or ./install.sh) — they never run this script.
//
// Usage:
//   npm run build && npm run sync
//   (or)  node scripts/sync-to-raycast.cjs
//

const fs = require("fs");
const path = require("path");
const os = require("os");

const repoRoot = path.join(__dirname, "..");
const distDir = path.join(repoRoot, "dist");
const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf-8"));
const extName = pkg.name; // e.g. "vibelet-search"

if (!fs.existsSync(distDir)) {
  console.error(`dist/ not found — run "npm run build" first.`);
  process.exit(1);
}

// Find every `~/.config/raycast*` directory.
const configHome = path.join(os.homedir(), ".config");
let raycastVariants = [];
try {
  raycastVariants = fs
    .readdirSync(configHome, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^raycast/.test(e.name))
    .map((e) => path.join(configHome, e.name));
} catch {
  // ~/.config doesn't exist — nothing to sync.
}

const targets = raycastVariants
  .map((variantDir) => path.join(variantDir, "extensions", extName))
  .filter((d) => fs.existsSync(d));

if (targets.length === 0) {
  console.log(`No Raycast install with "${extName}" found under ~/.config/raycast*.`);
  console.log(`Tip: import the extension once via Raycast → "Import Extension", then re-run.`);
  process.exit(0);
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
    // Preserve exec bit (matters for assets/rg).
    if (stat.mode & 0o111) fs.chmodSync(dest, 0o755);
  }
}

for (const target of targets) {
  for (const entry of fs.readdirSync(distDir)) {
    copyRecursive(path.join(distDir, entry), path.join(target, entry));
  }
  console.log(`✓ Synced to ${target}`);
}

console.log(`\nDone. Reload the command in Raycast (ESC then re-open) to pick up changes.`);
