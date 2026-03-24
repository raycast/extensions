import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { mergePdfs } from "../src/lib/merge-pdfs";

const ENCRYPTED_PDF_BASE64 =
  "JVBERi0xLjcKJb/3ov4KMSAwIG9iago8PCAvRXh0ZW5zaW9ucyA8PCAvQURCRSA8PCAvQmFzZVZlcnNpb24gLzEuNyAvRXh0ZW5zaW9uTGV2ZWwgOCA+PiA+PiAvUGFnZXMgMyAwIFIgL1R5cGUgL0NhdGFsb2cgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL09ialN0bSAvTGVuZ3RoIDI1NiAvRmlsdGVyIC9GbGF0ZURlY29kZSAvTiAzIC9GaXJzdCAxNSA+PgpzdHJlYW0KVQD7jp57UYgkxcB2zjAKlUtvgwwg74NjEn8tWiSIKVFUBA+1tdA/hhsX6gnha7DGrjA+mpn3GnKNkaYsvTl9M71DqTG9rAZsyVJHBKr69unqzU0OZ7IeTalAwpcbgIcaTmtuc07tvZNRa8dDAtA7xNZVkBYVBFMN75vh3J3JFsR4yu0uGTcVZyeSDl5c6iCF16wOIGCboVMxpanO9pHfwS66snwvFrQAdFh9GBlC879lPu6OskpHux6ej37U46VpRndVw6/Ga23xsMacgSuwiuIZCEKrRn01HxwcDbifY/cCVAAMQvhBtOJm7lf6SROoLF8F9uwnxiMh+FWviVpK92VuZHN0cmVhbQplbmRvYmoKNiAwIG9iago8PCAvQ0YgPDwgL1N0ZENGIDw8IC9BdXRoRXZlbnQgL0RvY09wZW4gL0NGTSAvQUVTVjMgL0xlbmd0aCAzMiA+PiA+PiAvRmlsdGVyIC9TdGFuZGFyZCAvTGVuZ3RoIDI1NiAvTyA8ZjJjZDRiYjdmNjNmNGIyYmIzMTc5MDM3MmYwNGIzMzMzMzliYjQ4YjNlOTkxNTcyMDg5YmY4NWIyODJkYWVjZTlmMDg0ZTljMTgyMzM3ZDBhMDNlZWI5MjVjNjQxYjkwPiAvT0UgPGZjMGRjZTljMzNhZThmNDFmODQ3YWVkMDNmMDY4ZThlY2ZkMWUzM2M3NzcxM2VkMDJmNmM1NjI2NGM5MTFhMmU+IC9QIC00IC9QZXJtcyA8N2QzMjg3NDljYjBhM2U1MTQ4NmJmZTA4MDI0YmVjNTA+IC9SIDYgL1N0bUYgL1N0ZENGIC9TdHJGIC9TdGRDRiAvVSA8YjAzZWM4MTgxOWFiOWI0YTYxNTYyNTcyMWQ0ODBmNjNkM2U3NDU0OWZhYzVmNDJmZDBlNmQxYzExYzk1MzI4Yjk1NzY1ZTcyNTg4ZjNmZDlkNGM2MDlhOGRhNWMyZDY4PiAvVUUgPDhjOWI2NzdlY2NkMGUwNTFlMzU4YjU2OGRjMDZhYjVjYjc5NTUwNjM2ZTQ4ZThhYWEwYzZlMGQyMDlhZjVmMWY+IC9WIDUgPj4KZW5kb2JqCjcgMCBvYmoKPDwgL1R5cGUgL1hSZWYgL0xlbmd0aCAzOCAvRmlsdGVyIC9GbGF0ZURlY29kZSAvRGVjb2RlUGFybXMgPDwgL0NvbHVtbnMgNCAvUHJlZGljdG9yIDEyID4+IC9XIFsgMSAyIDEgXSAvSW5mbyA0IDAgUiAvUm9vdCAxIDAgUiAvU2l6ZSA4IC9JRCBbPDI2MjY4NjJjMmY5NTNjNzFmZjNlNGUxY2JjMmI3MTBlPjwyNjI2ODYyYzJmOTUzYzcxZmYzZTRlMWNiYzJiNzEwZT5dIC9FbmNyeXB0IDYgMCBSID4+CnN0cmVhbQp4nGNiAAImRgZ+BiYGhmIQqwHEYmCEEP8Zn/xjYmBWZgAAMGQEHwplbmRzdHJlYW0KZW5kb2JqCnN0YXJ0eHJlZgoxMDMzCiUlRU9GCg==";

const createPdfWithPageSizes = async (sizes: Array<[number, number]>): Promise<Uint8Array> => {
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
  await assert.rejects(async () => mergePdfs([]), /At least one PDF source is required\./);
});

test("mergePdfs throws a clear error for password-protected PDFs", async () => {
  const encryptedPdf = Buffer.from(ENCRYPTED_PDF_BASE64, "base64");

  await assert.rejects(async () => mergePdfs([{ data: encryptedPdf }]), /Password-protected PDFs are not supported\./);
});
