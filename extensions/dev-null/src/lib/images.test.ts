import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";
import { afterAll, describe, expect, it } from "vitest";
import { loadImages, MAX_IMAGE_BYTES, resolvePath, sniffType } from "./images";

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

describe("resolvePath", () => {
  it("expands a leading ~ and trims", () => {
    expect(resolvePath(" ~/Desktop/a.png ")).toBe(join(homedir(), "Desktop/a.png"));
    expect(resolvePath("/tmp/~a.png")).toBe("/tmp/~a.png");
  });
});
