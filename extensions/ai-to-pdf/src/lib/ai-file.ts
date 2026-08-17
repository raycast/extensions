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
  const text = readHead(path);
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

/**
 * The page dictionary sits in the PDF part near the front of the file, so reading a
 * slice keeps this cheap even for the very large `.ai` files print work produces.
 */
function readHead(path: string): string | undefined {
  const CHUNK = 2 * 1024 * 1024;
  try {
    const size = statSync(path).size;
    const length = Math.min(size, CHUNK);
    const buffer = Buffer.allocUnsafe(length);
    const fd = openSync(path, "r");
    try {
      readSync(fd, buffer, 0, length, 0);
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
