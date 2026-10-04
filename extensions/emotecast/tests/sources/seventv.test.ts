import { afterEach, describe, expect, it, vi } from "vitest";
import { seventv } from "../../src/sources/seventv";
import { fetchCall, first } from "../helpers";

type ApiImage = {
  url: string;
  mime: string;
  width: number;
  height: number;
};

function image(scale: number, mime: string): ApiImage {
  return {
    url: `https://cdn.7tv.app/emote/ID/${scale}x.${mime.split("/")[1]}`,
    mime,
    width: 32 * scale,
    height: 32 * scale,
  };
}

function respond(items: unknown[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { emotes: { search: { items } } } }),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("seventv.search", () => {
  it("keeps only GIF variants for animated emotes", async () => {
    vi.stubGlobal(
      "fetch",
      respond([
        {
          id: "ID",
          defaultName: "catJAM",
          flags: { animated: true, nsfw: false },
          images: [
            image(1, "image/gif"),
            image(4, "image/gif"),
            image(1, "image/webp"),
            image(1, "image/avif"),
          ],
        },
      ]),
    );

    const emote = first(await seventv.search({ query: "catJAM", animatedOnly: true }));
    expect(emote.variants).toHaveLength(2);
    expect(emote.variants.every((v) => v.mime === "image/gif")).toBe(true);
  });

  it("keeps only PNG variants for still emotes, as 7TV serves no still GIF", async () => {
    vi.stubGlobal(
      "fetch",
      respond([
        {
          id: "ID",
          defaultName: "Sadge",
          flags: { animated: false, nsfw: false },
          images: [image(1, "image/png"), image(1, "image/webp")],
        },
      ]),
    );

    const emote = first(await seventv.search({ query: "Sadge", animatedOnly: false }));
    expect(emote.animated).toBe(false);
    expect(emote.variants.map((v) => v.mime)).toEqual(["image/png"]);
  });

  it("sorts variants by ascending height", async () => {
    vi.stubGlobal(
      "fetch",
      respond([
        {
          id: "ID",
          defaultName: "catJAM",
          flags: { animated: true, nsfw: false },
          images: [
            image(4, "image/gif"),
            image(1, "image/gif"),
            image(2, "image/gif"),
          ],
        },
      ]),
    );

    const emote = first(await seventv.search({ query: "x", animatedOnly: true }));
    expect(emote.variants.map((v) => v.height)).toEqual([32, 64, 128]);
  });

  it("drops emotes that expose no usable variant", async () => {
    vi.stubGlobal(
      "fetch",
      respond([
        {
          id: "ID",
          defaultName: "broken",
          flags: { animated: true, nsfw: false },
          images: [image(1, "image/webp")],
        },
      ]),
    );

    expect(await seventv.search({ query: "x", animatedOnly: true })).toEqual([]);
  });

  it("carries the NSFW flag through", async () => {
    vi.stubGlobal(
      "fetch",
      respond([
        {
          id: "ID",
          defaultName: "spicy",
          flags: { animated: true, nsfw: true },
          images: [image(1, "image/gif")],
        },
      ]),
    );

    const emote = first(await seventv.search({ query: "x", animatedOnly: true }));
    expect(emote.nsfw).toBe(true);
    expect(emote.key).toBe("7tv:ID");
  });

  it("asks the server to filter animated emotes, rather than filtering locally", async () => {
    const fetchMock = respond([]);
    vi.stubGlobal("fetch", fetchMock);

    await seventv.search({ query: "x", animatedOnly: true });
    const body = JSON.parse(String(fetchCall(fetchMock, 0).init.body));
    expect(body.variables.filters.animated).toBe(true);

    await seventv.search({ query: "x", animatedOnly: false });
    const second = JSON.parse(String(fetchCall(fetchMock, 1).init.body));
    expect(second.variables.filters.animated).toBeUndefined();
  });

  it("never sorts by name, which 7TV answers with a 500", async () => {
    const fetchMock = respond([]);
    vi.stubGlobal("fetch", fetchMock);
    await seventv.search({ query: "x", animatedOnly: false });
    const body = JSON.parse(String(fetchCall(fetchMock, 0).init.body));
    expect(body.variables.sort.sortBy).not.toBe("NAME_ALPHABETICAL");
  });

  it("sends no Authorization header, which would 401 even a public query", async () => {
    const fetchMock = respond([]);
    vi.stubGlobal("fetch", fetchMock);
    await seventv.search({ query: "x", animatedOnly: false });
    expect(fetchCall(fetchMock, 0).init.headers).not.toHaveProperty(
      "Authorization",
    );
  });

  it("surfaces GraphQL errors instead of returning an empty grid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ errors: [{ message: "sort is invalid" }] }),
      }),
    );

    await expect(
      seventv.search({ query: "x", animatedOnly: false }),
    ).rejects.toThrow("sort is invalid");
  });

  it("surfaces HTTP failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(
      seventv.search({ query: "x", animatedOnly: false }),
    ).rejects.toThrow("503");
  });
});
