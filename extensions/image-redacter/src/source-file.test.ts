import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import {
  countPdfPages,
  fingerprintFile,
  sourceMimeType,
  validateSource,
} from "./source-file";

async function temporaryFile(name: string, contents: Buffer | Uint8Array) {
  const directory = await mkdtemp(join(tmpdir(), "image-redacter-"));
  const path = join(directory, name);
  await writeFile(path, contents);
  return path;
}

test("recognizes supported image and PDF extensions case-insensitively", () => {
  assert.equal(sourceMimeType("Screenshot.PNG"), "image/png");
  assert.equal(sourceMimeType("photo.jpeg"), "image/jpeg");
  assert.equal(sourceMimeType("Contract.PDF"), "application/pdf");
  assert.equal(sourceMimeType("notes.txt"), undefined);
});

test("accepts an existing image without modifying it", async () => {
  const contents = Buffer.from("source remains untouched");
  const path = await temporaryFile("source.webp", contents);

  assert.equal(await validateSource(path), "image/webp");
  assert.deepEqual(await readFile(path), contents);
});

test("rejects unsupported and missing files", async () => {
  await assert.rejects(() => validateSource("notes.txt"), /Choose a PDF/);
  await assert.rejects(() => validateSource("missing.png"), /no longer exists/);
});

test("fingerprints files by contents rather than name", async () => {
  const first = await temporaryFile("a.png", Buffer.from("same bytes"));
  const renamed = await temporaryFile("b.png", Buffer.from("same bytes"));
  const different = await temporaryFile("a.png", Buffer.from("other bytes"));

  assert.equal(await fingerprintFile(first), await fingerprintFile(renamed));
  assert.notEqual(
    await fingerprintFile(first),
    await fingerprintFile(different),
  );
});

test("counts PDF pages and rejects damaged PDFs", async () => {
  const document = await PDFDocument.create();
  document.addPage();
  document.addPage();
  const path = await temporaryFile("two-pages.pdf", await document.save());

  assert.equal(await countPdfPages(path), 2);
  const damaged = await temporaryFile("damaged.pdf", Buffer.from("not a pdf"));
  await assert.rejects(() => countPdfPages(damaged), /damaged/);
});
