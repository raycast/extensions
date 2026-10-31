import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";

test("both OCR workflows use the bundled worker, engine and language data", async () => {
  const source = readFileSync(resolve("assets/editor.js"), "utf8");
  const factory = source.slice(
    source.indexOf("  async function createOcrWorker("),
    source.indexOf("  async function addSearchableText("),
  );
  let options: Record<string, unknown> = {};
  const create = runInNewContext(`${factory}\ncreateOcrWorker;`, {
    window: {
      Tesseract: {
        createWorker: async (
          _language: string,
          _engine: number,
          config: Record<string, unknown>,
        ) => {
          options = config;
        },
      },
    },
    vendorUrl: (path: string) => `http://127.0.0.1:3000/session/vendor/${path}`,
  });
  await create();
  assert.equal(options.workerBlobURL, false);
  assert.equal(options.cacheMethod, "none");
  assert.equal(
    options.workerPath,
    "http://127.0.0.1:3000/session/vendor/tesseract-worker.min.js",
  );
  assert.equal(
    options.corePath,
    "http://127.0.0.1:3000/session/vendor/ocr-core/",
  );
  assert.equal(
    options.langPath,
    "http://127.0.0.1:3000/session/vendor/ocr-lang",
  );
  assert.doesNotMatch(source, /Tesseract\.recognize\(/);
  assert.match(source, /worker = await createOcrWorker\(/);
  assert.match(source, /ocrWorker \?\?= await createOcrWorker\(/);
  const html = readFileSync(resolve("assets/editor.html"), "utf8");
  assert.doesNotMatch(html, /<script[^>]+https?:/);
  for (const file of [
    "tesseract.min.js",
    "tesseract-worker.min.js",
    "ocr-lang/eng.traineddata.gz",
    ...["", "-simd", "-lstm", "-simd-lstm"].flatMap((variant) => [
      `ocr-core/tesseract-core${variant}.wasm`,
      `ocr-core/tesseract-core${variant}.wasm.js`,
    ]),
  ]) {
    assert.ok(existsSync(resolve("assets/vendor", file)), `${file} is bundled`);
  }
  assert.ok(existsSync(resolve("assets/fonts/PlusJakartaSans.ttf")));
});
