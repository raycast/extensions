#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $(basename "$0") <dev|prod|status>" >&2
  exit 1
fi

PROFILE="$1"
REPO_ROOT="$(git rev-parse --show-toplevel)"
PACKAGE_JSON="$REPO_ROOT/package.json"

node - "$PACKAGE_JSON" "$PROFILE" <<'NODE'
const fs = require("fs");

const [packageJsonPath, profile] = process.argv.slice(2);
const raw = fs.readFileSync(packageJsonPath, "utf8");
const pkg = JSON.parse(raw);

const profiles = {
  dev: {
    name: "velja-dev",
    title: "Velja Dev",
    mention: "@velja-dev",
  },
  prod: {
    name: "velja-raycast",
    title: "Velja",
    mention: "@velja-raycast",
  },
};

function detectCurrentProfile() {
  if (pkg.name === "velja-lmoloney-dev" && pkg.title === profiles.dev.title) {
    return "dev";
  }

  if (pkg.name === profiles.dev.name && pkg.title === profiles.dev.title) {
    return "dev";
  }

  if (pkg.name === profiles.prod.name && pkg.title === profiles.prod.title) {
    return "prod";
  }

  return "custom";
}

if (profile === "status") {
  const current = detectCurrentProfile();
  console.log(
    JSON.stringify(
      {
        profile: current,
        name: pkg.name,
        title: pkg.title,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const target = profiles[profile];
if (!target) {
  console.error(`Invalid profile "${profile}". Use dev, prod, or status.`);
  process.exit(1);
}

pkg.name = target.name;
pkg.title = target.title;

if (pkg.ai?.evals && Array.isArray(pkg.ai.evals)) {
  pkg.ai.evals = pkg.ai.evals.map((entry) => {
    if (typeof entry?.input !== "string") {
      return entry;
    }

    return {
      ...entry,
      input: entry.input.replace(/@velja-(?:lmoloney-dev|dev|raycast)\b/g, target.mention),
    };
  });
}

fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`Switched extension profile to ${profile} (${target.name} / ${target.title}).`);
NODE
