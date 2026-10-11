import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vendor = join(root, "assets", "vendor");
const pdfjs = join(root, "node_modules", "pdfjs-dist");
const tesseract = join(root, "node_modules", "tesseract.js");
const core = join(root, "node_modules", "tesseract.js-core");
const language = join(root, "node_modules", "@tesseract.js-data", "eng");

// The editor promises to keep documents on this computer, so every library the
// browser needs is served from the extension's assets rather than a CDN.
const copies = [
  [join(pdfjs, "legacy", "build", "pdf.min.mjs"), join(vendor, "pdf.min.mjs")],
  [
    join(pdfjs, "legacy", "build", "pdf.worker.min.mjs"),
    join(vendor, "pdf.worker.min.mjs"),
  ],
  [join(pdfjs, "LICENSE"), join(vendor, "LICENSE-pdfjs")],
  [join(pdfjs, "wasm"), join(vendor, "pdfjs-wasm")],
  [join(pdfjs, "standard_fonts"), join(vendor, "pdfjs-standard-fonts")],
  [join(pdfjs, "cmaps"), join(vendor, "pdfjs-cmaps")],
  [join(pdfjs, "iccs"), join(vendor, "pdfjs-iccs")],
  [
    join(root, "node_modules", "pdf-lib", "dist", "pdf-lib.min.js"),
    join(vendor, "pdf-lib.min.js"),
  ],
  [
    join(root, "node_modules", "pdf-lib", "LICENSE.md"),
    join(vendor, "LICENSE-pdf-lib.md"),
  ],
  [
    join(tesseract, "dist", "tesseract.min.js"),
    join(vendor, "tesseract.min.js"),
  ],
  [
    join(tesseract, "dist", "worker.min.js"),
    join(vendor, "tesseract-worker.min.js"),
  ],
  [join(tesseract, "LICENSE.md"), join(vendor, "LICENSE-tesseract.md")],
  [
    join(tesseract, "dist", "tesseract.min.js.LICENSE.txt"),
    join(vendor, "tesseract.min.js.LICENSE.txt"),
  ],
  [
    join(tesseract, "dist", "worker.min.js.LICENSE.txt"),
    join(vendor, "tesseract-worker.min.js.LICENSE.txt"),
  ],
  [join(core, "LICENSE"), join(vendor, "LICENSE-tesseract-core")],
  [
    join(language, "4.0.0_best_int", "eng.traineddata.gz"),
    join(vendor, "ocr-lang", "eng.traineddata.gz"),
  ],
  [join(language, "package.json"), join(vendor, "ocr-lang", "package.json")],
  [
    join(root, "assets", "licenses", "LICENSE-tessdata"),
    join(vendor, "ocr-lang", "LICENSE"),
  ],
];
for (const name of await readdir(core)) {
  if (/^tesseract-core.*\.wasm(?:\.js)?$/.test(name)) {
    copies.push([join(core, name), join(vendor, "ocr-core", name)]);
  }
}

await rm(vendor, { recursive: true, force: true });
await mkdir(vendor, { recursive: true });
for (const [from, to] of copies) await cp(from, to, { recursive: true });
console.log(`Vendored ${copies.length} entries into assets/vendor`);
