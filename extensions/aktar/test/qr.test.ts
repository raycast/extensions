import jsQR from "jsqr";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { qrCodePNG } from "../src/lib/qr/png";
import { encodeQR } from "../src/lib/qr/qrcode";

/** Reads back the 1-bit grayscale PNG `qrCodePNG` writes, as RGBA pixels for jsQR. */
function decodePNG(png: Buffer) {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  expect(png[24]).toBe(1); // bit depth
  expect(png[25]).toBe(0); // grayscale

  const idat: Buffer[] = [];
  for (let offset = 8; offset < png.length; ) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") idat.push(png.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const rowBytes = Math.ceil(width / 8);
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    expect(raw[y * (rowBytes + 1)]).toBe(0); // no filter
    for (let x = 0; x < width; x++) {
      const white = (raw[y * (rowBytes + 1) + 1 + (x >>> 3)] >>> (7 - (x & 7))) & 1;
      pixels.fill(white ? 255 : 0, (y * width + x) * 4, (y * width + x) * 4 + 3);
      pixels[(y * width + x) * 4 + 3] = 255;
    }
  }
  return { width, height, pixels };
}

function scan(link: string) {
  const { width, height, pixels } = decodePNG(qrCodePNG(encodeQR(link)));
  return jsQR(pixels, width, height)?.data;
}

const presigned =
  "https://backups.s3.eu-central-1.amazonaws.com/2026/09/quarterly%20report.pdf" +
  "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20260927%2Feu-central-1%2Fs3%2Faws4_request" +
  "&X-Amz-Date=20260927T120000Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host" +
  "&X-Amz-Signature=" +
  "a".repeat(64);

describe("QR codes", () => {
  it.each([
    ["a short link (version 1-2)", "https://x.co/a"],
    ["a public link", "https://files.example.com/2026/09/hero-background.jpg"],
    ["a presigned link (version 7 and up)", presigned],
    ["non-ASCII characters", "https://files.example.com/belgeler/çalışma-planı-ğüşö.pdf"],
    ["a very long link (version 30 and up)", `https://files.example.com/${"x".repeat(1500)}`],
  ])("scans back to %s", (_, link) => {
    expect(scan(link)).toBe(link);
  });

  it("scans back at lengths from 1 to 600 characters, across QR versions", () => {
    for (let length = 1; length <= 600; length += 11) {
      const link = `https://e.co/${"abcdefghij".repeat(60)}`.slice(0, length);
      expect(scan(link)).toBe(link);
    }
  });

  it("refuses a link too long for any QR code", () => {
    expect(() => encodeQR(`https://files.example.com/${"x".repeat(3000)}`)).toThrow("too long");
  });
});
