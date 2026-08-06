import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { pixelWidth } from "../src/lib/image";

const DIR = mkdtempSync(join(tmpdir(), "image-"));
process.on("exit", () => rmSync(DIR, { recursive: true, force: true }));

/** Writes `bytes` to a file of its own and measures what came back. */
function measure(name: string, bytes: Buffer): number | null {
  const file = join(DIR, name);
  writeFileSync(file, bytes);
  return pixelWidth(file);
}

/** A PNG's signature and its IHDR chunk, which is all the width needs. */
function png(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24);
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  buf.writeUInt32BE(13, 8);
  buf.write("IHDR", 12, "latin1");
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

/** A GIF's header block, whose screen descriptor carries the width. */
function gif(width: number, height: number): Buffer {
  const buf = Buffer.alloc(13);
  buf.write("GIF89a", 0, "latin1");
  buf.writeUInt16LE(width, 6);
  buf.writeUInt16LE(height, 8);
  return buf;
}

/** A JPEG segment: its marker, its length, and `size` bytes of payload. */
function segment(marker: number, size: number): Buffer {
  const buf = Buffer.alloc(4 + size);
  buf.set([0xff, marker]);
  buf.writeUInt16BE(2 + size, 2);
  return buf;
}

/**
 * A JPEG whose frame header sits behind `before`, each entry a marker to write
 * a segment for first. `sof` is the frame marker itself, which varies by
 * encoding.
 */
function jpeg(
  width: number,
  height: number,
  { sof = 0xc0, before = [] as number[] } = {},
): Buffer {
  const frame = segment(sof, 6);
  frame[4] = 8; // Sample precision, ahead of the two dimensions.
  frame.writeUInt16BE(height, 5);
  frame.writeUInt16BE(width, 7);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    ...before.map((marker) => segment(marker, 16)),
    frame,
  ]);
}

test("a PNG is measured from its header chunk", () => {
  assert.equal(measure("shot.png", png(1500, 950)), 1500);
});

test("a GIF is measured from its screen descriptor", () => {
  assert.equal(measure("loop.gif", gif(320, 240)), 320);
});

test("a JPEG is measured from its frame header", () => {
  assert.equal(measure("photo.jpg", jpeg(4032, 3024)), 4032);
});

test("a JPEG's frame header is found behind the metadata before it", () => {
  // The case that makes this a scan rather than a fixed offset: a camera or a
  // screenshot writes EXIF, a colour profile and a thumbnail ahead of the frame.
  const buf = jpeg(800, 600, { before: [0xe0, 0xe1, 0xe2] });
  assert.equal(measure("exif.jpg", buf), 800);
});

test("a JPEG's table segments are not read as a frame", () => {
  // 0xc4 and 0xcc sit inside the frame marker's range and describe tables.
  const buf = jpeg(640, 480, { before: [0xc4, 0xcc] });
  assert.equal(measure("tables.jpg", buf), 640);
});

test("a progressive JPEG is a frame like any other", () => {
  assert.equal(measure("progressive.jpg", jpeg(1024, 768, { sof: 0xc2 })), 1024);
});

test("a format whose bytes are not read measures nothing", () => {
  // WebP and SVG reach here, neither worth a decoder while the caller caps
  // what it cannot measure.
  const webp = Buffer.concat([
    Buffer.from("RIFF", "latin1"),
    Buffer.alloc(4),
    Buffer.from("WEBPVP8 ", "latin1"),
    Buffer.alloc(16),
  ]);
  assert.equal(measure("art.webp", webp), null);
  assert.equal(measure("logo.svg", Buffer.from("<svg width='40'/>")), null);
});

test("a truncated header measures nothing", () => {
  assert.equal(measure("cut.png", png(1500, 950).subarray(0, 20)), null);
  assert.equal(measure("cut.jpg", Buffer.from([0xff, 0xd8, 0xff])), null);
});

test("a file that is not there measures nothing", () => {
  assert.equal(pixelWidth(join(DIR, "gone.png")), null);
});
