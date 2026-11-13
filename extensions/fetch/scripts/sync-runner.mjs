// Copy the detached download runner into assets/.
//
// `startDownload` resolves the runner from a fixed search list. In dev it finds
// it under node_modules, but a Store build ships no node_modules — the only
// surviving candidate is `assets/raycast-downloader-runner.js`. Without it every
// download fails with "runner not found" in the published extension only.
//
// The copy is COMMITTED rather than generated at publish time because
// `ray publish` runs its own build and never invokes this script.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve("@chrismessina/raycast-downloader/detach"));
const src = join(pkgDir, "runner.bundle.js");
const destDir = join(import.meta.dirname, "..", "assets");
const dest = join(destDir, "raycast-downloader-runner.js");

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`runner synced -> ${dest}`);
