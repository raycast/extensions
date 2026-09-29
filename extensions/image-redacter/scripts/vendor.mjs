import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vendor = join(root, "assets", "vendor");
const pdfjs = join(root, "node_modules", "pdfjs-dist");

// The editor promises to keep documents on this computer, so every library the
// browser needs is served from the extension's assets rather than a CDN.
const copies = [
  [join(pdfjs, "legacy", "build", "pdf.min.mjs"), join(vendor, "pdf.min.mjs")],
  [join(pdfjs, "legacy", "build", "pdf.worker.min.mjs"), join(vendor, "pdf.worker.min.mjs")],
  [join(pdfjs, "LICENSE"), join(vendor, "LICENSE-pdfjs")],
  [join(pdfjs, "wasm"), join(vendor, "pdfjs-wasm")],
  [join(pdfjs, "standard_fonts"), join(vendor, "pdfjs-standard-fonts")],
  [join(pdfjs, "cmaps"), join(vendor, "pdfjs-cmaps")],
  [join(pdfjs, "iccs"), join(vendor, "pdfjs-iccs")],
  [join(root, "node_modules", "pdf-lib", "dist", "pdf-lib.min.js"), join(vendor, "pdf-lib.min.js")],
  [join(root, "node_modules", "pdf-lib", "LICENSE.md"), join(vendor, "LICENSE-pdf-lib.md")],
];

await rm(vendor, { recursive: true, force: true });
await mkdir(vendor, { recursive: true });
for (const [from, to] of copies) await cp(from, to, { recursive: true });
console.log(`Vendored ${copies.length} entries into assets/vendor`);
