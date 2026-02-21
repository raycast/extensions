#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
PACKAGE_JSON="$REPO_ROOT/package.json"

node - "$PACKAGE_JSON" <<'NODE'
const fs = require("fs");

const [packageJsonPath] = process.argv.slice(2);
const raw = fs.readFileSync(packageJsonPath, "utf8");
const pkg = JSON.parse(raw);

const errors = [];

if (pkg.name !== "velja-raycast") {
  errors.push(`Expected package.json name to be "velja-raycast", found "${pkg.name}".`);
}

if (pkg.title !== "Velja") {
  errors.push(`Expected package.json title to be "Velja", found "${pkg.title}".`);
}

if (raw.includes("@velja-dev") || raw.includes("@velja-lmoloney-dev")) {
  errors.push("Found dev AI mention (@velja-dev) in package.json.");
}

if (errors.length > 0) {
  console.error("Upstream profile check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Upstream profile check passed.");
NODE
