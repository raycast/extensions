import { closeSync, openSync, readSync } from "node:fs";

/**
 * How wide an image is, read from its own bytes.
 *
 * The pane asks only to tell an image that overruns it from one that does not,
 * so a format this cannot read costs nothing: `links.ts` caps what it cannot
 * measure. Hence the three formats a paste arrives in and no more. WebP stores
 * its width three ways depending on the codec, and an SVG has no pixel width at
 * all.
 */

/**
 * Bytes read from the head of a file.
 *
 * PNG and GIF declare their size in the first two dozen. JPEG's comes after
 * whatever metadata precedes the frame header, and a screenshot's EXIF, colour
 * profile and thumbnail run to tens of kilobytes between them. A frame header
 * behind more than this is not measured.
 */
const HEAD = 64 * 1024;

function head(file: string): Buffer | null {
  let fd: number | undefined;
  try {
    fd = openSync(file, "r");
    const buf = Buffer.alloc(HEAD);
    return buf.subarray(0, readSync(fd, buf, 0, HEAD, 0));
  } catch {
    // Gone, unreadable, a directory: nothing to measure.
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** IHDR is required to be a PNG's first chunk, so the width is at a fixed offset. */
function pngWidth(buf: Buffer): number | null {
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  return buf.readUInt32BE(16);
}

/** A GIF's logical screen descriptor follows its six-byte signature. */
function gifWidth(buf: Buffer): number | null {
  if (buf.length < 10) return null;
  const signature = buf.toString("latin1", 0, 6);
  if (signature !== "GIF87a" && signature !== "GIF89a") return null;
  return buf.readUInt16LE(6);
}

/**
 * Markers inside the frame range that describe tables rather than a frame.
 * Reading one as a frame takes two bytes of a Huffman table for the width.
 */
const NOT_A_FRAME = new Set([0xc4, 0xc8, 0xcc]);

/** Markers that stand alone: no length follows them, so nothing is skipped. */
function isStandalone(marker: number): boolean {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9);
}

/**
 * A JPEG says how wide it is in its frame header, which sits behind however
 * many metadata segments the encoder wrote, so the segments are walked until
 * one of them is a frame.
 *
 * A photo EXIF says to rotate reports its dimensions as stored, so a quarter
 * turn reports the height. The caller only compares the number against a
 * budget, so the cost is at most a wrongly capped photo.
 */
function jpegWidth(buf: Buffer): number | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 <= buf.length) {
    // Segments are contiguous, so anything else means the walk has lost its
    // place and every offset past here is a guess.
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    // Fill bytes: a marker may be padded with any number of them.
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (isStandalone(marker)) {
      i += 2;
      continue;
    }
    // The compressed scan, which is not segmented. No header follows it.
    if (marker === 0xda) return null;
    if (marker >= 0xc0 && marker <= 0xcf && !NOT_A_FRAME.has(marker))
      return buf.readUInt16BE(i + 7); // Past the length and sample precision.
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

/** The width of `file` in pixels, or null where its bytes do not say. */
export function pixelWidth(file: string): number | null {
  const buf = head(file);
  if (!buf) return null;
  return pngWidth(buf) ?? gifWidth(buf) ?? jpegWidth(buf);
}
