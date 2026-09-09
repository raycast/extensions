import { Jimp } from "jimp";
import { describe, expect, it } from "vitest";
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
