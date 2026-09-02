import { openSync, readSync, closeSync, statSync } from "fs";

export type DetectedBleed = {
  /** Bleed per side in points, in PDF order: left, bottom, right, top. */
  sides: [number, number, number, number];
  /** Largest of the four sides — what a single, linked bleed value has to be. */
  maxPt: number;
  uniform: boolean;
};

type Box = [number, number, number, number];

/**
 * Illustrator does not expose a document's bleed to scripting, but a PDF-compatible
 * `.ai` writes it into its own PDF part: the TrimBox is the artboard and the BleedBox
 * sits around it. The gap between the two is the document bleed.
 */
export function detectBleed(path: string): DetectedBleed | undefined {
  return detectIn(readHead(path));
}

export type ExportedBoxes = {
  bleed?: DetectedBleed;
  /** Width and height of the MediaBox: the sheet the PDF really is, bleed included. */
  mediaSize?: [number, number];
};

/**
 * The same reading, over the whole file. Illustrator puts the page dictionary of a
 * PDF it writes wherever it lands, which in a heavy print file is well past the
 * head slice — and a check on the bleed that just gives up is worse than none.
 *
 * Not every PDF setting writes a TrimBox and a BleedBox; a MediaBox is always
 * there, so the sheet size is collected in the same pass as a second opinion.
 */
export function readExportedBoxes(path: string): ExportedBoxes {
  const found: ExportedBoxes = {};
  for (const chunk of readChunks(path)) {
    found.bleed ??= detectIn(chunk);
    found.mediaSize ??= sizeOf(findBox(chunk, "MediaBox"));
    if (found.bleed && found.mediaSize) {
      break;
    }
  }
  return found;
}

/**
 * Width and height of the artboard the source document defines. Read over the
 * whole file, since this only runs when the exported bleed needs a second
 * opinion — not on the form's path, where every picked file is measured.
 */
export function detectArtboardSize(path: string): [number, number] | undefined {
  for (const chunk of readChunks(path)) {
    const size = sizeOf(findBox(chunk, "TrimBox"));
    if (size) {
      return size;
    }
  }
  return undefined;
}

function sizeOf(box: Box | undefined): [number, number] | undefined {
  return box ? [box[2] - box[0], box[3] - box[1]] : undefined;
}

function detectIn(text: string | undefined): DetectedBleed | undefined {
  if (!text) {
    return undefined;
  }

  const trim = findBox(text, "TrimBox");
  const bleed = findBox(text, "BleedBox");
  if (!trim || !bleed) {
    return undefined;
  }

  const sides: Box = [
    trim[0] - bleed[0], // left
    trim[1] - bleed[1], // bottom
    bleed[2] - trim[2], // right
    bleed[3] - trim[3], // top
  ];

  // A malformed or unexpected pair should read as "unknown", not as a negative bleed.
  if (sides.some((value) => !Number.isFinite(value) || value < -0.01)) {
    return undefined;
  }

  const clamped = sides.map((value) => Math.max(0, value)) as Box;
  const maxPt = Math.max(...clamped);
  // Tolerate a fraction of a point: Illustrator writes 2.8346 and 2.8347 for the
  // same 1 mm, which is not a document with an uneven bleed.
  const uniform = clamped.every((value) => Math.abs(value - maxPt) < 0.5);

  return { sides: clamped, maxPt, uniform };
}

const CHUNK = 2 * 1024 * 1024;
/** Enough for a page dictionary that happens to straddle two chunks. */
const OVERLAP = 64 * 1024;

/**
 * In an `.ai` the page dictionary sits in the PDF part near the front of the file,
 * so reading a slice keeps this cheap even for the very large files print work
 * produces — and this runs for every file picked in the form.
 */
function readHead(path: string): string | undefined {
  return read(path, 0, CHUNK);
}

/** Walks the file in overlapping slices, so nothing is held in memory whole. */
function* readChunks(path: string): Generator<string> {
  let size: number;
  try {
    size = statSync(path).size;
  } catch {
    return;
  }
  for (let offset = 0; offset < size; offset += CHUNK - OVERLAP) {
    const chunk = read(path, offset, CHUNK);
    if (!chunk) {
      return;
    }
    yield chunk;
  }
}

function read(path: string, offset: number, length: number): string | undefined {
  try {
    const size = statSync(path).size;
    const wanted = Math.min(length, Math.max(0, size - offset));
    if (wanted === 0) {
      return undefined;
    }
    const buffer = Buffer.allocUnsafe(wanted);
    const fd = openSync(path, "r");
    try {
      readSync(fd, buffer, 0, wanted, offset);
    } finally {
      closeSync(fd);
    }
    return buffer.toString("latin1");
  } catch {
    return undefined;
  }
}

function findBox(text: string, name: string): Box | undefined {
  const match = new RegExp(`/${name}\\s*\\[\\s*([-\\d.\\s]+?)\\s*\\]`).exec(text);
  if (!match) {
    return undefined;
  }
  const numbers = match[1].split(/\s+/).map(Number);
  if (numbers.length !== 4 || numbers.some((value) => !Number.isFinite(value))) {
    return undefined;
  }
  return numbers as Box;
}

export const PT_TO_MM = 25.4 / 72;
