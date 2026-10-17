import { Jimp } from "jimp";
import { describe, expect, it, vi } from "vitest";
import { imageToAscii, imageToDots } from "../src/image-art";

const SOURCE_SIZE = 8;
async function image(color: number) {
  return new Jimp({ width: SOURCE_SIZE, height: SOURCE_SIZE, color }).getBuffer("image/png");
}

describe("image ASCII", () => {
  it("maps black pixels to dense characters and accounts for character proportions", async () => {
    expect(await imageToAscii(await image(0x000000ff), 4)).toBe("@@@@\n@@@@");
  });
  it("treats transparent backgrounds as white", async () => {
    expect(await imageToAscii(await image(0x00000000), 4)).toBe("\n");
  });
  it("supports inverted contrast", async () => {
    expect(await imageToAscii(await image(0xffffffff), 4, true)).toBe("@@@@\n@@@@");
  });
  it("keeps a tall image proportional while bounding output height", async () => {
    const buffer = await new Jimp({ width: 2, height: 256, color: 0x000000ff }).getBuffer("image/png");
    const lines = (await imageToAscii(buffer)).split("\n");
    expect(lines).toHaveLength(64);
    expect(lines.every((line) => line === "@")).toBe(true);
  });
  it("caps extremely narrow images in both renderers", async () => {
    const buffer = await new Jimp({ width: 1, height: 1000, color: 0x000000ff }).getBuffer("image/png");
    for (const render of [imageToAscii, imageToDots]) {
      expect((await render(buffer)).split("\n")).toHaveLength(64);
    }
  });
  it("decodes JPEG input", async () => {
    const buffer = await new Jimp({ width: SOURCE_SIZE, height: SOURCE_SIZE, color: 0x000000ff }).getBuffer(
      "image/jpeg",
    );
    expect(await imageToAscii(buffer, 4)).toBe("@@@@\n@@@@");
  });
  it("rejects corrupt images", async () => {
    await expect(imageToAscii(Buffer.from("not an image"))).rejects.toThrow();
  });
});

it.each([
  [4001, 4000],
  [8193, 1],
  [1, 8193],
])("rejects oversized PNG dimensions %i x %i before decoding", async (width, height) => {
  const buffer = await image(0x000000ff);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  const decode = vi.spyOn(Jimp, "fromBuffer");
  try {
    for (const render of [imageToAscii, imageToDots]) {
      await expect(render(buffer)).rejects.toThrow("16 megapixels");
    }
    expect(decode).not.toHaveBeenCalled();
  } finally {
    decode.mockRestore();
  }
});

it("rejects oversized JPEG headers before decoding", async () => {
  const buffer = await new Jimp({ width: SOURCE_SIZE, height: SOURCE_SIZE, color: 0x000000ff }).getBuffer("image/jpeg");
  const frame = buffer.indexOf(Buffer.from([0xff, 0xc0]));
  expect(frame).toBeGreaterThan(0);
  buffer.writeUInt16BE(5000, frame + 5);
  buffer.writeUInt16BE(5000, frame + 7);
  const decode = vi.spyOn(Jimp, "fromBuffer");
  try {
    await expect(imageToAscii(buffer)).rejects.toThrow("16 megapixels");
    expect(decode).not.toHaveBeenCalled();
  } finally {
    decode.mockRestore();
  }
});

it("rejects unsupported formats before decoding", async () => {
  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  const decode = vi.spyOn(Jimp, "fromBuffer");
  try {
    await expect(imageToAscii(gif)).rejects.toThrow("PNG or JPEG");
    expect(decode).not.toHaveBeenCalled();
  } finally {
    decode.mockRestore();
  }
});
