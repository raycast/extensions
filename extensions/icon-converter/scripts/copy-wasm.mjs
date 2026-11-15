// Copies the WASM codecs out of node_modules into assets/, where the extension
// loads them at runtime. Re-run (npm run copy-wasm) after updating a codec dependency.
import { copyFileSync } from "node:fs";

const files = {
  "resvg.wasm": "@resvg/resvg-wasm/index_bg.wasm",
  "webp_enc.wasm": "@jsquash/webp/codec/enc/webp_enc.wasm",
  "webp_dec.wasm": "@jsquash/webp/codec/dec/webp_dec.wasm",
  "avif_dec.wasm": "@jsquash/avif/codec/dec/avif_dec.wasm",
};
for (const [name, source] of Object.entries(files)) {
  copyFileSync(new URL(`../node_modules/${source}`, import.meta.url), new URL(`../assets/${name}`, import.meta.url));
  console.log(`assets/${name}`);
}
