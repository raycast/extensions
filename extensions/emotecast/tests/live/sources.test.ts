import { describe, expect, it } from "vitest";
import { EMOJI_HEIGHT, STICKER_HEIGHT } from "../../src/types";
import { SOURCES } from "../../src/sources";
import { seventv } from "../../src/sources/seventv";
import { first, last } from "../helpers";

describe.each(SOURCES.map((source) => [source.title, source] as const))(
  "%s answers with a usable payload",
  (_title, source) => {
    it("returns emotes for a common query", async () => {
      const emotes = await source.search({
        query: "catJAM",
        animatedOnly: true,
      });
      expect(emotes.length).toBeGreaterThan(0);
    });

    it("gives every emote at least one variant with a positive height", async () => {
      const emotes = await source.search({
        query: "catJAM",
        animatedOnly: true,
      });
      for (const emote of emotes.slice(0, 20)) {
        expect(emote.variants.length).toBeGreaterThan(0);
        expect(emote.key).toContain(":");
        for (const variant of emote.variants) {
          expect(variant.height).toBeGreaterThan(0);
          expect(variant.url).toMatch(/^https:\/\//);
        }
      }
    });

    it("returns still emotes too", async () => {
      const emotes = await source.search({
        query: "monkaS",
        animatedOnly: false,
      });
      expect(emotes.some((emote) => !emote.animated)).toBe(true);
    });
  },
);

describe("7TV height contract", () => {
  it("still serves the exact target heights, which lets us skip transcoding", async () => {
    const emotes = await seventv.search({
      query: "catJAM",
      animatedOnly: true,
    });
    const heights = new Set(first(emotes).variants.map((v) => v.height));
    expect(heights.has(EMOJI_HEIGHT)).toBe(true);
    expect(heights.has(STICKER_HEIGHT)).toBe(true);
  });

  it("still serves native GIF for animated emotes", async () => {
    const emotes = await seventv.search({
      query: "catJAM",
      animatedOnly: true,
    });
    expect(first(emotes).variants.every((v) => v.mime === "image/gif")).toBe(
      true,
    );
  });

  it("normalises on height, so wide emotes keep their ratio", async () => {
    const emotes = await seventv.search({
      query: "widepeepoHappy",
      animatedOnly: true,
    });
    const wide = emotes.find((e) => e.name === "widepeepoHappy");
    if (!wide) return;
    expect(last(wide.variants).height).toBe(STICKER_HEIGHT);
  });
});
