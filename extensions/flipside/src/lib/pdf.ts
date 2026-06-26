/**
 * PDF assembly with pdf-lib (pure JS, no native deps).
 *
 * The duplex collation recipe was reverse-engineered on a Brother MFC-J4550DW
 * with this flip convention:
 *   - Pass 1 (fronts): load page-1 on top, face up, top edge into the feeder.
 *   - Pass 2 (backs):  flip the output stack left-to-right, reload.
 * Result:
 *   - Pass 1 yields even pages in descending order (6,4,2), upright.
 *   - Pass 2 yields odd pages in ascending order (1,3,5), rotated 180°.
 * So: odd pages = pass 2 rotated 180°, even pages = pass 1 reversed; interleave.
 */
import { PDFDocument, degrees } from "pdf-lib";

async function addImagePage(doc: PDFDocument, jpeg: Uint8Array, dpi: number, rotate180: boolean): Promise<void> {
  const img = await doc.embedJpg(jpeg);
  const widthPt = (img.width * 72) / dpi;
  const heightPt = (img.height * 72) / dpi;
  const page = doc.addPage([widthPt, heightPt]);
  page.drawImage(img, { x: 0, y: 0, width: widthPt, height: heightPt });
  if (rotate180) page.setRotation(degrees(180));
}

/** Interleave the two ADF passes into a correctly ordered PDF. */
export async function collateDuplex(fronts: Uint8Array[], backs: Uint8Array[], dpi: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const odd = backs; // 1,3,5,…  (rotated 180° below)
  const even = [...fronts].reverse(); // 2,4,6,…
  const sheets = Math.max(odd.length, even.length);
  for (let i = 0; i < sheets; i++) {
    if (i < odd.length) await addImagePage(doc, odd[i], dpi, true);
    if (i < even.length) await addImagePage(doc, even[i], dpi, false);
  }
  return doc.save();
}

/** Build a PDF from a single ADF pass, in scan order. */
export async function singleSidedPdf(pages: Uint8Array[], dpi: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const page of pages) await addImagePage(doc, page, dpi, false);
  return doc.save();
}

/**
 * Reorder an already-concatenated front/back PDF (fronts first, then backs)
 * into correct order. With `reverseBacks`, the back half is taken in reverse
 * (the result of flipping the whole stack between passes).
 */
export async function reorderConcatenated(bytes: Uint8Array, reverseBacks: boolean): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes);
  const total = src.getPageCount();
  if (total < 2) throw new Error("PDF has fewer than 2 pages — nothing to reorder.");

  const half = Math.ceil(total / 2);
  const fronts = Array.from({ length: half }, (_, i) => i); // 0 … half-1
  const backs = Array.from({ length: total - half }, (_, i) => half + i); // half … total-1
  if (reverseBacks) backs.reverse();

  const order: number[] = [];
  for (let i = 0; i < half; i++) {
    order.push(fronts[i]);
    if (i < backs.length) order.push(backs[i]);
  }

  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, order);
  copied.forEach((p) => out.addPage(p));
  return out.save();
}
