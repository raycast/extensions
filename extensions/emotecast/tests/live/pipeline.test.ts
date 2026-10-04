import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readImageInfo } from "../../src/core/image";
import { prepareEmoteFile } from "../../src/io/prepare";
import { SOURCES } from "../../src/sources";
import { bttv } from "../../src/sources/bttv";
import { ffz } from "../../src/sources/ffz";
import { EMOJI_HEIGHT, STICKER_HEIGHT } from "../../src/types";
import { last } from "../helpers";

const cacheDir = () => mkdtempSync(join(tmpdir(), "emotecast-live-"));

function hasTransparencyFlag(buffer: Buffer): boolean {
  for (let i = 0; i < buffer.length - 8; i++) {
    const isGraphicControl =
      buffer[i] === 0x21 && buffer[i + 1] === 0xf9 && buffer[i + 2] === 0x04;
    if (isGraphicControl && ((buffer[i + 3] ?? 0) & 0x01) === 1) return true;
  }
  return false;
}

function countGifFrames(buffer: Buffer): number {
  let frames = 0;
  for (let i = 0; i < buffer.length - 3; i++) {
    if (buffer[i] === 0x21 && buffer[i + 1] === 0xf9 && buffer[i + 2] === 0x04) {
      frames++;
    }
  }
  return frames;
}

describe.each(SOURCES.map((source) => [source.title, source] as const))(
  "%s end to end",
  (_title, source) => {
    it.each([
      ["emoji", EMOJI_HEIGHT],
      ["sticker", STICKER_HEIGHT],
    ])("produces an animated GIF at exactly %s height", async (_l, height) => {
      const emotes = await source.search({
        query: "catJAM",
        animatedOnly: true,
      });
      const emote = emotes.find((e) => e.animated);
      expect(emote).toBeDefined();
      if (!emote) return;

      const file = await prepareEmoteFile(emote, height, {
        cacheDir: cacheDir(),
      });
      const buffer = readFileSync(file);
      const info = readImageInfo(buffer);

      expect(info?.format).toBe("gif");
      expect(info?.height).toBe(height);
      expect(countGifFrames(buffer)).toBeGreaterThan(1);
    });

    it("produces a still PNG at the exact height", async () => {
      const emotes = await source.search({
        query: "monkaS",
        animatedOnly: false,
      });
      const emote = emotes.find((e) => !e.animated);
      expect(emote).toBeDefined();
      if (!emote) return;

      const file = await prepareEmoteFile(emote, STICKER_HEIGHT, {
        cacheDir: cacheDir(),
      });
      const info = readImageInfo(readFileSync(file));
      expect(info?.format).toBe("png");
      expect(info?.height).toBe(STICKER_HEIGHT);
    });
  },
);

describe("providers that misreport their dimensions", () => {
  it("reaches the exact height even when the declared one is wrong", async () => {
    const emotes = await bttv.search({ query: "pepeJAM", animatedOnly: false });
    const emote = emotes.find((e) => e.name === "pepeJAM");
    if (!emote) return;

    const declared = last(emote.variants).height;
    const file = await prepareEmoteFile(emote, STICKER_HEIGHT, {
      cacheDir: cacheDir(),
    });
    const info = readImageInfo(readFileSync(file));

    expect(declared).toBe(112);
    expect(info?.height).toBe(STICKER_HEIGHT);
  });
});

describe("animated WebP sources", () => {
  it("keeps transparency, without which emotes render on a black block", async () => {
    const emotes = await ffz.search({ query: "catJAM", animatedOnly: true });
    const emote = emotes.find((e) => e.animated);
    if (!emote) return;
    expect(emote.variants.every((v) => v.mime === "image/webp")).toBe(true);

    const file = await prepareEmoteFile(emote, STICKER_HEIGHT, {
      cacheDir: cacheDir(),
    });
    const buffer = readFileSync(file);

    expect(readImageInfo(buffer)?.format).toBe("gif");
    expect(countGifFrames(buffer)).toBeGreaterThan(1);
    expect(buffer.subarray(0, 6).toString("latin1")).toBe("GIF89a");
    expect(hasTransparencyFlag(buffer)).toBe(true);
  });
});
