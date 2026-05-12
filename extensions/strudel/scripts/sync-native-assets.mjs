import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const src = path.dirname(require.resolve("node-web-audio-api"));
const dest = path.join(root, "assets", "node-web-audio-api");

mkdirSync(dest, { recursive: true });
cpSync(src, dest, {
  recursive: true,
  filter: (p) => !p.includes("node_modules"),
});

console.log("Synced node-web-audio-api assets from npm package.");

// @strudel/webaudio bundles superdough's onceEnded but the bundler strips the
// named function `function cleanup()` to anonymous, so releaseAudioNode's own
// dev-mode guard (`onended.name !== "cleanup"`) warns about its own code.
// Restore the function name to silence the false positive.
const webaudioDist = path.join(root, "node_modules/@strudel/webaudio/dist/index.mjs");
const patched = readFileSync(webaudioDist, "utf8").replace(
  /e\.onended = function\(\)/,
  "e.onended = function cleanup()",
);
writeFileSync(webaudioDist, patched);
console.log("Patched @strudel/webaudio onceEnded function name.");
