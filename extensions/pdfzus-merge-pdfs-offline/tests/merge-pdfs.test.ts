import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { mergePdfs } from "../src/lib/merge-pdfs";

const createPdfWithPageSizes = async (
  sizes: Array<[number, number]>,
): Promise<Uint8Array> => {
  const document = await PDFDocument.create();

  for (const [width, height] of sizes) {
    document.addPage([width, height]);
  }

  return document.save();
};

test("mergePdfs merges pages in the input order", async () => {
  const first = await createPdfWithPageSizes([
    [101, 201],
    [102, 202],
  ]);
  const second = await createPdfWithPageSizes([[103, 203]]);

  const merged = await mergePdfs([{ data: first }, { data: second }]);
  const mergedDocument = await PDFDocument.load(merged);

  assert.equal(mergedDocument.getPageCount(), 3);
  assert.deepEqual(mergedDocument.getPage(0).getSize(), {
    width: 101,
    height: 201,
  });
  assert.deepEqual(mergedDocument.getPage(1).getSize(), {
    width: 102,
    height: 202,
  });
  assert.deepEqual(mergedDocument.getPage(2).getSize(), {
    width: 103,
    height: 203,
  });
});

test("mergePdfs throws for empty input", async () => {
  await assert.rejects(
    async () => mergePdfs([]),
    /At least one PDF source is required\./,
  );
});
