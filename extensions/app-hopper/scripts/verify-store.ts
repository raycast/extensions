import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { config, directory, root, verifyHelper } from "./native-helpers.ts";
import type { NativeManifest } from "./native-helpers.ts";
import { verifyStoreMetadata } from "./store-metadata.ts";

const manifest: NativeManifest = JSON.parse(readFileSync(path.join(directory, "manifest.json"), "utf8"));
if (manifest.version !== 1 || manifest.minimumMacOS !== config.minimumMacOS) {
  throw new Error("Invalid native helper manifest. Run npm run build:native.");
}
const files = ["assets/native/manifest.json", ...verifyStoreMetadata(root)];
for (const helper of config.helpers) {
  // Store review needs traceable, verified binaries. Developer ID remains an optional distribution mode.
  verifyHelper(helper, manifest.helpers[helper.name]);
  files.push(
    `assets/native/${manifest.helpers[helper.name].file}`,
    ...[helper.source, ...helper.additionalSources].map((source) => `assets/${source}`),
  );
}
try {
  execFileSync("git", ["ls-files", "--error-unmatch", "--", ...new Set(files)], {
    cwd: root,
    stdio: "pipe",
  });
} catch {
  throw new Error("Store assets must be tracked in Git. Add the native helpers, screenshots, and listing files first.");
}
console.log(`Store submission verified: ${config.helpers.length} universal helpers (${manifest.signing}).`);
console.log("Raycast review and downloaded-install acceptance are separate from these local checks.");
