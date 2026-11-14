import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import {
  nativeHelpers as config,
  nativeHelperSourceHash as sourceHash,
  type NativeHelper,
} from "../src/native-helper-catalog";

const root = path.resolve(__dirname, "..");
const assets = path.join(root, "assets");

type NativeEntry = { file: string; sourceHash: string; sha256: string };
export type NativeManifest = {
  version: 1;
  minimumMacOS: string;
  signing: "developer-id" | "ad-hoc";
  helpers: Record<string, NativeEntry>;
};
const directory = path.join(assets, "native");

function digest(file: string) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function run(binary: string, args: string[]) {
  return execFileSync(binary, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120000 });
}

function verifyHelper(
  helper: NativeHelper,
  entry: NativeEntry | undefined,
  release = false,
  helperDirectory = directory,
) {
  const hash = sourceHash(helper, assets);
  if (!entry || entry.sourceHash !== hash || entry.file !== `${helper.name}-${hash}`) {
    throw new Error(`${helper.name}: bundled helper is missing or does not match its sources`);
  }
  const file = path.join(helperDirectory, entry.file);
  if (digest(file) !== entry.sha256) throw new Error(`${helper.name}: binary checksum does not match`);
  const architectures = run("/usr/bin/lipo", ["-archs", file]).trim().split(/\s+/);
  if (!architectures.includes("arm64") || !architectures.includes("x86_64")) {
    throw new Error(`${helper.name}: both arm64 and x86_64 are required`);
  }
  run("/usr/bin/codesign", ["--verify", "--strict", "--all-architectures", file]);
  if (release) {
    for (const architecture of ["arm64", "x86_64"]) {
      // codesign writes signature details to stderr, even on success.
      const result = spawnSync("/usr/bin/codesign", ["-dvv", "--arch", architecture, file], { encoding: "utf8" });
      const details = result.stderr ?? "";
      if (
        result.status !== 0 ||
        !details.includes("Authority=Developer ID Application:") ||
        !/TeamIdentifier=[A-Z0-9]{10}/.test(details) ||
        !/flags=.*runtime/.test(details) ||
        !details.includes("Timestamp=")
      ) {
        throw new Error(
          `${helper.name}: ${architecture} needs Developer ID signing, hardened runtime, and a secure timestamp`,
        );
      }
    }
  }
}

export { root, assets, config, directory, sourceHash, digest, run, verifyHelper };
