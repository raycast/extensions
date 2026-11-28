// Copies the Redact SDK into assets/runtime. Raycast bundles src/ with esbuild,
// which cannot bundle koffi's `.node` addon or keep the paths the SDK uses to
// find its prebuilt library and wasm files, so the SDK is loaded at runtime
// from real files instead (see src/redact.ts).
//
// Two builds are kept:
// - native (Core ML, through koffi) for Apple silicon: fast and small, but the
//   SDK only ships it for darwin-arm64;
// - WebAssembly (LiteRT.js) as the fallback for Intel Macs. Only the plain
//   (non-threaded, non-JSPI) LiteRT variant is kept, the one it loads under Node.
import { cpSync, rmSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const from = path.join(root, "node_modules");
const to = path.join(root, "assets", "runtime", "node_modules");

const packages = [
  "@desert-ant-labs/redact",
  "@desert-ant-labs/core",
  "koffi",
  "@bjorn3/browser_wasi_shim",
  "@litertjs/core",
  "@litertjs/wasm-utils",
];

const keep = (rel) => {
  // Native libraries for platforms other than Apple silicon.
  if (/^@desert-ant-labs\/redact\/native\/(?!darwin-arm64)/.test(rel)) return false;
  // koffi: only the prebuilt addon for Apple silicon, no sources or docs.
  if (/^koffi\/(src|doc|vendor)(\/|$)/.test(rel)) return false;
  if (/^koffi\/build\/koffi\/(?!darwin_arm64)/.test(rel)) return false;
  // LiteRT variants that are never loaded under Node.
  if (/^@litertjs\/core\/wasm\/litert_wasm_(compat|jspi|threaded)_internal\./.test(rel)) return false;
  return true;
};

rmSync(path.join(root, "assets", "runtime"), { recursive: true, force: true });
for (const pkg of packages) {
  cpSync(path.join(from, pkg), path.join(to, pkg), {
    recursive: true,
    filter: (src) => keep(path.relative(from, src)),
  });
}
console.log(`vendored Redact runtime into ${path.relative(root, to)}`);
