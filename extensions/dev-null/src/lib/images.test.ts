import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";
import { afterAll, describe, expect, it } from "vitest";
import { imageSize, loadImages, MAX_IMAGE_BYTES, resolvePath, sniffType } from "./images";

const dir = mkdtempSync(join(tmpdir(), "devnull-images-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** A real, black RGB PNG that sips can read. */
function png(width: number, height: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const rows = Buffer.alloc((width * 3 + 1) * height);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** A JPEG header up to its frame: SOI, an APP0 segment, then a SOF marker carrying the size. */
function jpeg(width: number, height: number, sof = 0xc0): Buffer {
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, ...Buffer.from("JFIF\0", "latin1"), 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  // A DHT segment first, whose marker (C4) sits in the SOF range but holds no size.
  const dht = Buffer.from([0xff, 0xc4, 0x00, 0x04, 0x00, 0x00]);
  const frame = Buffer.from([
    0xff,
    sof,
    0x00,
    0x0b,
    8,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    1,
    1,
    0x11,
    0,
  ]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, dht, frame, Buffer.from([0xff, 0xd9])]);
}

/** A WebP header in one of its three forms: lossy (VP8), lossless (VP8L) or extended (VP8X). */
function webp(kind: "VP8 " | "VP8L" | "VP8X", width: number, height: number): Buffer {
  let payload: Buffer;
  if (kind === "VP8 ") {
    payload = Buffer.alloc(10);
    payload.set([0x9d, 0x01, 0x2a], 3);
    payload.writeUInt16LE(width & 0x3fff, 6);
    payload.writeUInt16LE(height & 0x3fff, 8);
  } else if (kind === "VP8L") {
    payload = Buffer.alloc(5);
    payload[0] = 0x2f;
    payload.writeUInt32LE(((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14), 1);
  } else {
    payload = Buffer.alloc(10);
    payload.writeUIntLE(width - 1, 4, 3);
    payload.writeUIntLE(height - 1, 7, 3);
  }
  const chunkHeader = Buffer.alloc(8);
  chunkHeader.write(kind, 0, "latin1");
  chunkHeader.writeUInt32LE(payload.length, 4);
  const body = Buffer.concat([Buffer.from("WEBP", "latin1"), chunkHeader, payload]);
  const riff = Buffer.alloc(8);
  riff.write("RIFF", 0, "latin1");
  riff.writeUInt32LE(body.length, 4);
  return Buffer.concat([riff, body]);
}

function file(name: string, data: Buffer): string {
  const path = join(dir, name);
  writeFileSync(path, data);
  return path;
}

describe("sniffType", () => {
  it("reads the type from the bytes", () => {
    expect(sniffType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffType(png(1, 1))).toBe("image/png");
    expect(sniffType(Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "latin1"))).toBe("image/webp");
    expect(sniffType(Buffer.from("GIF89a"))).toBeUndefined();
  });
});

describe("loadImages", () => {
  it("loads a valid image and hashes exactly its bytes", async () => {
    const data = png(2, 2);
    const [image] = await loadImages([file("ok.png", data)]);
    expect(image).toMatchObject({ name: "ok.png", type: "image/png" });
    expect(image.sha256).toBe(createHash("sha256").update(data).digest("hex"));
  });

  it("refuses more than 3 images before reading any", async () => {
    await expect(loadImages(["/a", "/b", "/c", "/d"])).rejects.toThrow("up to 3 images");
  });

  it("refuses a file that isn't a JPEG, PNG or WebP, whatever its extension", async () => {
    await expect(loadImages([file("fake.png", Buffer.from("GIF89a not really"))])).rejects.toThrow(
      "fake.png is not a JPEG, PNG or WebP image.",
    );
  });

  it("refuses a file over the size limit", async () => {
    const path = file("big.png", png(1, 1));
    truncateSync(path, MAX_IMAGE_BYTES + 1);
    await expect(loadImages([path])).rejects.toThrow("big.png is larger than 10 MB.");
  });

  it("refuses an image wider than 6,000 pixels", async () => {
    await expect(loadImages([file("wide.png", png(6001, 1))])).rejects.toThrow("wide.png is 6001×1");
  });

  it("reads the dimensions from the image, not from a file name that looks like them", async () => {
    // sips prints the file name before the properties it was asked for.
    const name = "pixelWidth: 1 pixelHeight: 1.png";
    await expect(loadImages([file(name, png(6001, 1))])).rejects.toThrow(`${name} is 6001×1`);
  });

  it("refuses a relative path and a missing file", async () => {
    await expect(loadImages(["shot.png"])).rejects.toThrow("not a full path");
    await expect(loadImages([join(dir, "missing.png")])).rejects.toThrow("Could not read the image missing.png.");
  });
});

describe("imageSize", () => {
  it("reads a PNG's size from its header", () => {
    expect(imageSize(png(640, 480))).toEqual({ width: 640, height: 480 });
  });

  it("reads a JPEG's size from its frame, skipping segments that come before it", () => {
    expect(imageSize(jpeg(6001, 2))).toEqual({ width: 6001, height: 2 });
    // Progressive JPEGs use SOF2.
    expect(imageSize(jpeg(300, 200, 0xc2))).toEqual({ width: 300, height: 200 });
  });

  it("reads a WebP's size in each of its three forms", () => {
    expect(imageSize(webp("VP8 ", 6001, 3))).toEqual({ width: 6001, height: 3 });
    expect(imageSize(webp("VP8L", 4, 6001))).toEqual({ width: 4, height: 6001 });
    expect(imageSize(webp("VP8X", 7000, 5))).toEqual({ width: 7000, height: 5 });
  });

  it("refuses a header that is cut off after the size or lacks its signature", () => {
    // A PNG cut inside its IHDR chunk, with the width and height still there.
    expect(imageSize(png(10, 10).subarray(0, 24))).toBeUndefined();
    // A lossy WebP whose frame has no start code.
    const noStartCode = webp("VP8 ", 10, 10);
    noStartCode.fill(0, 23, 26);
    expect(imageSize(noStartCode)).toBeUndefined();
    // A lossless WebP without its signature byte.
    const noSignature = webp("VP8L", 10, 10);
    noSignature[20] = 0;
    expect(imageSize(noSignature)).toBeUndefined();
  });

  it("gives up on a truncated header rather than guessing", () => {
    expect(imageSize(png(10, 10).subarray(0, 20))).toBeUndefined();
    expect(imageSize(jpeg(10, 10).subarray(0, 30))).toBeUndefined();
    expect(imageSize(webp("VP8X", 10, 10).subarray(0, 24))).toBeUndefined();
  });
});

describe("loadImages, beyond PNG", () => {
  it("refuses a JPEG or WebP over 6,000 pixels on a side", async () => {
    await expect(loadImages([file("wide.jpg", jpeg(6001, 1))])).rejects.toThrow("wide.jpg is 6001×1");
    await expect(loadImages([file("tall.webp", webp("VP8L", 1, 6001))])).rejects.toThrow("tall.webp is 1×6001");
  });
});

describe("resolvePath", () => {
  it("expands a leading ~ and trims", () => {
    expect(resolvePath(" ~/Desktop/a.png ")).toBe(join(homedir(), "Desktop/a.png"));
    expect(resolvePath("/tmp/~a.png")).toBe("/tmp/~a.png");
  });
});
