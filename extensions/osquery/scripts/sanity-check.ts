#!/usr/bin/env npx ts-node

/**
 * Sanity check script for Raycast extension
 * Validates that all commands, assets, and build outputs are properly configured
 */

import * as fs from "fs";
import * as path from "path";

const ROOT_DIR = path.join(__dirname, "..");
const SRC_DIR = path.join(ROOT_DIR, "src");
const ASSETS_DIR = path.join(ROOT_DIR, "assets");
const DIST_DIR = path.join(ROOT_DIR, "dist");

interface Command {
  name: string;
  title: string;
  description: string;
  mode: string;
}

interface PackageJson {
  name: string;
  title: string;
  icon: string;
  author: string;
  license: string;
  commands: Command[];
  categories: string[];
}

let errors: string[] = [];
let warnings: string[] = [];

function error(msg: string) {
  errors.push(`❌ ${msg}`);
}

function warn(msg: string) {
  warnings.push(`⚠️  ${msg}`);
}

function success(msg: string) {
  console.log(`✅ ${msg}`);
}

function checkPackageJson(): PackageJson | null {
  const pkgPath = path.join(ROOT_DIR, "package.json");
  if (!fs.existsSync(pkgPath)) {
    error("package.json not found");
    return null;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  // Required fields
  if (!pkg.name) error("package.json missing 'name' field");
  if (!pkg.title) error("package.json missing 'title' field");
  if (!pkg.author) error("package.json missing 'author' field");
  if (!pkg.icon) error("package.json missing 'icon' field");
  if (!pkg.license)
    warn("package.json missing 'license' field (required for store)");
  if (!pkg.categories || pkg.categories.length === 0) {
    warn("package.json missing 'categories' (required for store)");
  }
  if (!pkg.commands || pkg.commands.length === 0) {
    error("package.json has no commands defined");
  }

  if (pkg.name && pkg.title && pkg.commands) {
    success("package.json structure valid");
  }

  return pkg;
}

function checkSourceFiles(pkg: PackageJson) {
  if (!fs.existsSync(SRC_DIR)) {
    error("src/ directory not found");
    return;
  }

  let allFound = true;
  for (const cmd of pkg.commands) {
    const tsxPath = path.join(SRC_DIR, `${cmd.name}.tsx`);
    const tsPath = path.join(SRC_DIR, `${cmd.name}.ts`);

    if (!fs.existsSync(tsxPath) && !fs.existsSync(tsPath)) {
      error(
        `Source file missing for command '${cmd.name}': expected ${cmd.name}.tsx or ${cmd.name}.ts`,
      );
      allFound = false;
    }
  }

  if (allFound) {
    success(`All ${pkg.commands.length} command source files found`);
  }
}

function checkAssets(pkg: PackageJson) {
  if (!fs.existsSync(ASSETS_DIR)) {
    error("assets/ directory not found");
    return;
  }

  // Check main icon
  const iconPath = path.join(ASSETS_DIR, pkg.icon);
  if (!fs.existsSync(iconPath)) {
    // Also check root
    const rootIconPath = path.join(ROOT_DIR, pkg.icon);
    if (!fs.existsSync(rootIconPath)) {
      error(`Extension icon not found: ${pkg.icon}`);
    }
  }

  // Check icon dimensions if it's a PNG
  if (pkg.icon.endsWith(".png")) {
    const iconFullPath = fs.existsSync(path.join(ASSETS_DIR, pkg.icon))
      ? path.join(ASSETS_DIR, pkg.icon)
      : path.join(ROOT_DIR, pkg.icon);

    if (fs.existsSync(iconFullPath)) {
      const stats = fs.statSync(iconFullPath);
      if (stats.size < 1000) {
        warn(`Extension icon may be too small (${stats.size} bytes)`);
      } else {
        success("Extension icon exists");
      }
    }
  } else {
    success("Extension icon exists");
  }
}

function checkBuildOutput(pkg: PackageJson) {
  if (!fs.existsSync(DIST_DIR)) {
    warn("dist/ directory not found - run 'npm run build' first");
    return;
  }

  let allFound = true;
  for (const cmd of pkg.commands) {
    const jsPath = path.join(DIST_DIR, `${cmd.name}.js`);
    if (!fs.existsSync(jsPath)) {
      error(
        `Build output missing for command '${cmd.name}': expected dist/${cmd.name}.js`,
      );
      allFound = false;
    }
  }

  if (allFound) {
    success(`All ${pkg.commands.length} command build outputs found in dist/`);

    // Check build freshness
    const srcFiles = pkg.commands.map((cmd) => {
      const tsxPath = path.join(SRC_DIR, `${cmd.name}.tsx`);
      return fs.existsSync(tsxPath)
        ? tsxPath
        : path.join(SRC_DIR, `${cmd.name}.ts`);
    });

    const distFiles = pkg.commands.map((cmd) =>
      path.join(DIST_DIR, `${cmd.name}.js`),
    );

    const newestSrc = Math.max(
      ...srcFiles.filter(fs.existsSync).map((f) => fs.statSync(f).mtimeMs),
    );
    const oldestDist = Math.min(
      ...distFiles.filter(fs.existsSync).map((f) => fs.statSync(f).mtimeMs),
    );

    if (newestSrc > oldestDist) {
      warn("Source files are newer than build output - rebuild recommended");
    } else {
      success("Build output is up to date");
    }
  }
}

function checkStoreRequirements() {
  // README
  const readmePath = path.join(ROOT_DIR, "README.md");
  if (!fs.existsSync(readmePath)) {
    warn("README.md not found (recommended for store)");
  } else {
    success("README.md exists");
  }

  // CHANGELOG
  const changelogPath = path.join(ROOT_DIR, "CHANGELOG.md");
  if (!fs.existsSync(changelogPath)) {
    warn("CHANGELOG.md not found (required for store releases)");
  } else {
    success("CHANGELOG.md exists");
  }

  // Screenshots
  const screenshotsDir = path.join(ROOT_DIR, "metadata");
  const altScreenshotsDir = path.join(ROOT_DIR, "screenshots");
  if (!fs.existsSync(screenshotsDir) && !fs.existsSync(altScreenshotsDir)) {
    warn(
      "No screenshots directory found (metadata/ or screenshots/) - required for store",
    );
  } else {
    success("Screenshots directory exists");
  }
}

// Main
console.log("\n🔍 Raycast Extension Sanity Check\n");
console.log("─".repeat(40));

const pkg = checkPackageJson();
if (pkg) {
  checkSourceFiles(pkg);
  checkAssets(pkg);
  checkBuildOutput(pkg);
  checkStoreRequirements();
}

console.log("─".repeat(40));

if (warnings.length > 0) {
  console.log("\nWarnings:");
  warnings.forEach((w) => console.log(`  ${w}`));
}

if (errors.length > 0) {
  console.log("\nErrors:");
  errors.forEach((e) => console.log(`  ${e}`));
  console.log(`\n💥 Sanity check failed with ${errors.length} error(s)\n`);
  process.exit(1);
} else if (warnings.length > 0) {
  console.log(`\n⚠️  Sanity check passed with ${warnings.length} warning(s)\n`);
} else {
  console.log("\n🎉 All checks passed!\n");
}
