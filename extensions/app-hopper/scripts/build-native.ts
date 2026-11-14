import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  renameSync,
  rmSync,
  chmodSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { assets, config, directory, sourceHash, digest, run, verifyHelper } from "./native-helpers.ts";
import type { NativeManifest } from "./native-helpers.ts";

const release = process.argv.includes("--release");
const identity = release ? process.env.APP_HOPPER_SIGNING_IDENTITY : "-";
if (process.platform !== "darwin") throw new Error("Build native helpers on macOS with Xcode Command Line Tools.");
if (!identity || (release && identity === "-")) {
  throw new Error("Release builds require APP_HOPPER_SIGNING_IDENTITY for a Developer ID Application certificate.");
}

mkdirSync(directory, { recursive: true });
let previous: NativeManifest | undefined;
try {
  previous = JSON.parse(readFileSync(path.join(directory, "manifest.json"), "utf8"));
} catch {
  // First build or unreadable cache: prepare every helper below.
}
const temporary = mkdtempSync(path.join(os.tmpdir(), "app-hopper-native-"));
const manifest: NativeManifest = {
  version: 1,
  minimumMacOS: config.minimumMacOS,
  signing: release || previous?.signing === "developer-id" ? "developer-id" : "ad-hoc",
  helpers: {},
};
const built: string[] = [];
try {
  for (const helper of config.helpers) {
    const hash = sourceHash(helper, assets);
    const cached = previous?.helpers?.[helper.name];
    if (!release && cached && previous?.minimumMacOS === config.minimumMacOS) {
      try {
        verifyHelper(helper, cached, previous?.signing === "developer-id");
        manifest.helpers[helper.name] = cached;
        continue;
      } catch {
        // A stale or invalid helper is rebuilt; release verification still requires Developer ID signing.
      }
    }
    const slices = ["arm64", "x86_64"].map((architecture) => {
      const file = path.join(temporary, `${helper.name}-${architecture}`);
      run("/usr/bin/swiftc", [
        "-O",
        "-target",
        `${architecture}-apple-macos${config.minimumMacOS}`,
        "-module-cache-path",
        path.join(temporary, "module-cache"),
        ...[helper.source, ...helper.additionalSources].map((source) => path.join(assets, source)),
        "-o",
        file,
      ]);
      return file;
    });
    const file = `${helper.name}-${hash}`;
    const output = path.join(temporary, file);
    run("/usr/bin/lipo", ["-create", ...slices, "-output", output]);
    run("/usr/bin/codesign", [
      "--force",
      "--sign",
      identity,
      ...(release ? ["--options", "runtime", "--timestamp"] : []),
      output,
    ]);
    chmodSync(output, 0o755);
    const entry = { file, sourceHash: hash, sha256: digest(output) };
    verifyHelper(helper, entry, release, temporary);
    built.push(file);
    if (!release) manifest.signing = "ad-hoc";
    manifest.helpers[helper.name] = entry;
    console.log(`Built ${helper.name}: arm64 + x86_64 (${manifest.signing})`);
  }
  // Stage on the destination volume so the final rename is atomic, including external checkouts.
  for (const file of built) {
    const staged = path.join(directory, `${file}.tmp`);
    copyFileSync(path.join(temporary, file), staged);
    chmodSync(staged, 0o755);
    renameSync(staged, path.join(directory, file));
  }
  const tempManifest = path.join(directory, "manifest.json.tmp");
  writeFileSync(tempManifest, JSON.stringify(manifest, null, 2) + "\n");
  renameSync(tempManifest, path.join(directory, "manifest.json"));
  const current = new Set(Object.values(manifest.helpers).map((entry) => entry.file));
  for (const file of readdirSync(directory)) {
    if (config.helpers.some((helper) => new RegExp(`^${helper.name}-[a-f0-9]{12}$`).test(file)) && !current.has(file)) {
      rmSync(path.join(directory, file));
    }
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
