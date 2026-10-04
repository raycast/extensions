import { afterEach, describe, expect, it, vi } from "vitest";
import { ffz } from "../../src/sources/ffz";
import { fetchCall, first } from "../helpers";

function respond(emoticons: unknown[]) {
  return vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ emoticons }) });
}

const animated = {
  id: 777171,
  name: "Catjam",
  height: 28,
  urls: { "1": "https://cdn.frankerfacez.com/emote/777171/1" },
  animated: {
    "1": "https://cdn.frankerfacez.com/emote/777171/animated/1",
    "2": "https://cdn.frankerfacez.com/emote/777171/animated/2",
    "4": "https://cdn.frankerfacez.com/emote/777171/animated/4",
  },
};

const still = {
  id: 130762,
  name: "monkaS",
  height: 32,
  urls: {
    "1": "https://cdn.frankerfacez.com/emote/130762/1",
    "2": "https://cdn.frankerfacez.com/emote/130762/2",
    "4": "https://cdn.frankerfacez.com/emote/130762/4",
  },
};

afterEach(() => vi.unstubAllGlobals());

describe("ffz.search", () => {
  it("multiplies the declared height by the scale", async () => {
    vi.stubGlobal("fetch", respond([animated]));
    const emote = first(await ffz.search({ query: "catjam", animatedOnly: true }));
    expect(emote.variants.map((v) => v.height)).toEqual([28, 56, 112]);
  });

  it("appends .webp on animated URLs, which the API omits", async () => {
    vi.stubGlobal("fetch", respond([animated]));
    const emote = first(await ffz.search({ query: "catjam", animatedOnly: true }));
    expect(emote.variants.every((v) => v.url.endsWith(".webp"))).toBe(true);
    expect(emote.variants.every((v) => v.mime === "image/webp")).toBe(true);
  });

  it("uses the still PNG route when the emote is not animated", async () => {
    vi.stubGlobal("fetch", respond([still]));
    const emote = first(await ffz.search({ query: "monkaS", animatedOnly: false }));
    expect(emote.animated).toBe(false);
    expect(first(emote.variants).mime).toBe("image/png");
    expect(first(emote.variants).url).not.toContain("animated");
    expect(first(emote.variants).url).not.toContain(".webp");
  });

  it("skips scales the emote does not expose", async () => {
    vi.stubGlobal("fetch", respond([{ ...still, urls: { "1": still.urls["1"] } }]));
    const emote = first(await ffz.search({ query: "x", animatedOnly: false }));
    expect(emote.variants).toHaveLength(1);
  });

  it("asks the server for animated emotes when filtering", async () => {
    const fetchMock = respond([]);
    vi.stubGlobal("fetch", fetchMock);

    await ffz.search({ query: "x", animatedOnly: true });
    expect(fetchCall(fetchMock, 0).url).toContain("animated=true");

    await ffz.search({ query: "x", animatedOnly: false });
    expect(fetchCall(fetchMock, 1).url).not.toContain("animated=true");
  });

  it("surfaces HTTP failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(ffz.search({ query: "x", animatedOnly: false })).rejects.toThrow(
      "500",
    );
  });
});
