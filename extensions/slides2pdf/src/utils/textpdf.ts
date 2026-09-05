import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, PageSizes, rgb } from "pdf-lib";

// Rendering is O(lines) with everything held in memory — cap input so a giant log
// file doesn't produce a multi-thousand-page PDF or exhaust memory.
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const FONT_SIZE = 9;
const LINE_HEIGHT = 12;
const MARGIN = 40;
const COURIER_CHAR_WIDTH = FONT_SIZE * 0.6; // Courier is monospaced at 600/1000 em

// The standard-14 fonts in pdf-lib encode text as WinAnsi and throw on anything outside it.
// Latin-1 plus these remapped 0x80–0x9F extras is the full WinAnsi repertoire; everything
// else (emoji, CJK, …) becomes "?". The u flag makes an astral char one match — one "?", not two.
const NON_WINANSI = /[^\x20-\x7E\xA0-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/gu;

// UTF-16 files (common for Windows/PowerShell exports) are text despite their NUL high
// bytes — decode by BOM before the binary sniff would misclassify them.
function decodeText(buf: Buffer): string | null {
  // Truncated files can have an odd byte count — swap16/utf16le need pairs, so drop the tail byte.
  const utf16Body = (buf.length - 2) % 2 ? buf.subarray(2, buf.length - 1) : buf.subarray(2);
  if (buf[0] === 0xff && buf[1] === 0xfe) return utf16Body.toString("utf16le");
  if (buf[0] === 0xfe && buf[1] === 0xff) return Buffer.from(utf16Body).swap16().toString("utf16le");
  // NUL byte in the first 8 KB → not text
  if (buf.subarray(0, 8192).includes(0)) return null;
  return buf.toString("utf8").replace(/^\uFEFF/, "");
}

// Render any plain-text file (code, JSON, Markdown, logs, …) to a paginated PDF
// with the built-in Courier font. Throws on binary or oversized input so callers
// fall through to their normal error handling.
export async function renderTextFilePdf(src: string, outputPath: string): Promise<void> {
  const buf = await fs.promises.readFile(src);
  if (buf.length > MAX_FILE_BYTES) {
    throw new Error(`File too large for text rendering (${(buf.length / 1024 / 1024).toFixed(1)} MB, limit 10 MB)`);
  }
  const text = decodeText(buf);
  if (text === null) {
    throw new Error(`Not a text file — cannot render ${path.extname(src) || "this file"} as plain text`);
  }
  const sourceLines = text.split(/\r\n|\r|\n/);

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Courier);
  const [pageWidth, pageHeight] = PageSizes.A4;
  const maxChars = Math.max(20, Math.floor((pageWidth - 2 * MARGIN) / COURIER_CHAR_WIDTH));

  let page = doc.addPage(PageSizes.A4);
  let y = pageHeight - MARGIN;
  let drawn = 0;
  const drawLine = async (line: string) => {
    if (y < MARGIN) {
      page = doc.addPage(PageSizes.A4);
      y = pageHeight - MARGIN;
    }
    if (line) page.drawText(line, { x: MARGIN, y: y - FONT_SIZE, size: FONT_SIZE, font, color: rgb(0.1, 0.1, 0.1) });
    y -= LINE_HEIGHT;
    // Yield periodically so a huge file doesn't freeze the event loop (and with it the
    // progress toast — the reason the whole conversion pipeline is async).
    if (++drawn % 2000 === 0) await new Promise((resolve) => setImmediate(resolve));
  };

  // Monospace font → wrap by character count, no width measuring needed.
  for (const raw of sourceLines) {
    const line = raw.replace(/\t/g, "    ").replace(NON_WINANSI, "?");
    if (line.length <= maxChars) {
      await drawLine(line);
    } else {
      for (let i = 0; i < line.length; i += maxChars) await drawLine(line.slice(i, i + maxChars));
    }
  }

  await fs.promises.writeFile(outputPath, await doc.save());
}
