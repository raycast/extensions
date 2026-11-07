import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
const manifest = JSON.parse(readFileSync("native/build-manifest.json", "utf8"));
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
if (hash("native/DisplayControl.swift") !== manifest.source)
  throw new Error("Native source changed. Run npm run build:native on macOS before building.");
for (const [name, expected] of Object.entries(manifest.binaries)) {
  if (hash(`assets/${name}`) !== expected)
    throw new Error(`Helper integrity check failed: ${name}. Run npm run build:native on macOS.`);
}
console.log("Native helper source and SHA-256 hashes verified.");
