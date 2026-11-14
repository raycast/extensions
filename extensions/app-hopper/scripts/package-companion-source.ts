import "./package-companion";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const readJson = (file: string) => JSON.parse(readFileSync(path.join(root, file), "utf8"));
const manifest = readJson("companion/manifest.json");
const lock = readJson("package-lock.json");
const name = "app-hopper-companion-review";
const dependencies = Object.fromEntries(
  ["typescript", "@types/firefox-webext-browser"].map((name) => [name, lock.packages[`node_modules/${name}`].version]),
);
const metadata = {
  name,
  version: manifest.version,
  private: true,
  type: "module",
  engines: { node: ">=22.20.0" },
  scripts: { build: "node --experimental-strip-types build.ts" },
  devDependencies: dependencies,
};
const directory = mkdtempSync(path.join(os.tmpdir(), "app-hopper-review-"));
const output = path.join(root, `dist/companion/app-hopper-companion-${manifest.version}-source.zip`);
try {
  const json = (file: string, value: unknown) =>
    writeFileSync(path.join(directory, file), JSON.stringify(value, null, 2) + "\n");
  mkdirSync(path.join(directory, "companion"));
  for (const file of ["background.ts", "manifest.json"])
    copyFileSync(path.join(root, "companion", file), path.join(directory, "companion", file));
  copyFileSync(path.join(root, "scripts/review-companion-build.ts"), path.join(directory, "build.ts"));
  json("package.json", metadata);
  json("package-lock.json", {
    name,
    version: manifest.version,
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": { name, version: manifest.version, devDependencies: dependencies, engines: metadata.engines },
      ...Object.fromEntries(
        Object.keys(dependencies).map((name) => [`node_modules/${name}`, lock.packages[`node_modules/${name}`]]),
      ),
    },
  });
  json("tsconfig.json", {
    include: ["companion/background.ts"],
    compilerOptions: {
      ...readJson("tsconfig.json").compilerOptions,
      ...readJson("tsconfig.companion.json").compilerOptions,
      outDir: "build",
    },
  });
  writeFileSync(
    path.join(directory, "README.md"),
    `# App Hopper Companion ${manifest.version} review source

This source rebuilds the same Firefox/Zen WebExtension. No minification or bundling is used.

## Environment

- Node.js 22.20.0 or newer (https://nodejs.org/en/download), npm 11 or newer.
- Build tools: TypeScript ${dependencies.typescript}, Firefox API types ${dependencies["@types/firefox-webext-browser"]}; exact versions and integrity hashes are in package-lock.json.
- Prepared on macOS. The build uses only Node.js and TypeScript and works on Linux (including the default AMO review environment). No Xcode, Raycast, native host, API keys, environment variables or external services are needed to build.

## Rebuild

Extract this ZIP and run from its root:

\x60\x60\x60sh
npm ci --ignore-scripts
npm run build
\x60\x60\x60

The build directory contains background.js and manifest.json. Compare these two files with the same files in app-hopper-companion-${manifest.version}.zip. They must match byte for byte. All runtime extension code is generated from companion/background.ts; the manifest is copied unchanged.

## Runtime integration

The add-on communicates through the local nativeMessaging hosts app_hopper.firefox (Firefox) or app_hopper.zen (Zen). Native hosts belong to the separately installed App Hopper Raycast extension. Zen has an optional separately installed local workspace bridge. These components are not bundled in this WebExtension, and are not needed to reproduce its package.
`,
  );
  rmSync(output, { force: true });
  execFileSync(
    "/usr/bin/zip",
    ["-X", "-r", output, "companion", "build.ts", "package.json", "package-lock.json", "tsconfig.json", "README.md"],
    { cwd: directory, stdio: "ignore" },
  );
  console.log(`Reviewer source archive: ${output}`);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
