import { readFileSync } from "node:fs";
import path from "node:path";
import { config, directory, verifyHelper } from "./native-helpers.ts";
import type { NativeManifest } from "./native-helpers.ts";

const manifest: NativeManifest = JSON.parse(readFileSync(path.join(directory, "manifest.json"), "utf8"));
const release = process.argv.includes("--release");
if (manifest.version !== 1 || manifest.minimumMacOS !== config.minimumMacOS)
  throw new Error("Invalid native helper manifest");
if (release && manifest.signing !== "developer-id")
  throw new Error("Prepare Developer ID-signed helpers before publishing.");
for (const helper of config.helpers) verifyHelper(helper, manifest.helpers[helper.name], release);
console.log(`Verified ${config.helpers.length} universal helpers (${manifest.signing}).`);
