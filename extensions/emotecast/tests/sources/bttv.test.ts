import { afterEach, describe, expect, it, vi } from "vitest";
import { bttv } from "../../src/sources/bttv";
import { at, fetchCall, first } from "../helpers";

function respond(items: unknown[]) {
  return vi.fn().mockResolvedValue({ ok: true, json: async () => items });
}

const catJam = {
  id: "5f1b",
  code: "catJAM",
  imageType: "gif",
  animated: true,
};
const monkaS = { id: "56e9", code: "monkaS", imageType: "png", animated: false };

afterEach(() => vi.unstubAllGlobals());

describe("bttv.search", () => {
  it("sends the Referer header, without which the CDN answers 403", async () => {
    const fetchMock = respond([]);
    vi.stubGlobal("fetch", fetchMock);

    await bttv.search({ query: "catJAM", animatedOnly: false });
    expect(fetchCall(fetchMock, 0).init.headers).toMatchObject({
      Referer: "https://betterttv.com/",
    });
  });

  it("exposes the three CDN scales with their measured heights", async () => {
    vi.stubGlobal("fetch", respond([catJam]));

    const emote = first(await bttv.search({ query: "catJAM", animatedOnly: false }));
    expect(emote.variants.map((v) => v.height)).toEqual([28, 56, 112]);
    expect(emote.variants.map((v) => v.url)).toEqual([
      "https://cdn.betterttv.net/emote/5f1b/1x",
      "https://cdn.betterttv.net/emote/5f1b/2x",
      "https://cdn.betterttv.net/emote/5f1b/3x",
    ]);
  });

  it("filters animated emotes locally, as the API offers no such filter", async () => {
    vi.stubGlobal("fetch", respond([catJam, monkaS]));

    const all = await bttv.search({ query: "x", animatedOnly: false });
    expect(all).toHaveLength(2);

    const animated = await bttv.search({ query: "x", animatedOnly: true });
    expect(animated.map((e) => e.name)).toEqual(["catJAM"]);
  });

  it("derives the mime type from imageType", async () => {
    vi.stubGlobal("fetch", respond([catJam, monkaS]));
    const found = await bttv.search({ query: "x", animatedOnly: false });
    expect(first(at(found, 0).variants).mime).toBe("image/gif");
    expect(first(at(found, 1).variants).mime).toBe("image/png");
  });

  it("url-encodes the query", async () => {
    const fetchMock = respond([]);
    vi.stubGlobal("fetch", fetchMock);
    await bttv.search({ query: "cat JAM&x", animatedOnly: false });
    expect(fetchCall(fetchMock, 0).url).toContain("query=cat%20JAM%26x");
  });

  it("requires three characters, which the API demands", () => {
    expect(bttv.minQueryLength).toBe(3);
  });

  it("surfaces HTTP failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(bttv.search({ query: "x", animatedOnly: false })).rejects.toThrow(
      "403",
    );
  });
});
