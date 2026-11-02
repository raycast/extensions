import assert from "node:assert/strict";
import { test } from "node:test";
import {
  searchEmotes,
  getEmoteFile,
  getEmoteKey,
  type Emote,
} from "../src/providers.ts";

test("recent, trending and alphabetical request independent 7TV sorts", async () => {
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    requests.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return Response.json({
      data: {
        emotes: { search: { items: [], totalCount: 100, pageCount: 2 } },
      },
    });
  };
  for (const sort of [
    "popular",
    "recent",
    "trending",
    "name-asc",
    "name-desc",
  ] as const) {
    await searchEmotes(
      { provider: "7tv", sort, query: "cat", page: 1, animatedOnly: false },
      undefined,
      fetcher,
    );
  }
  assert.ok(requests.every((r) => r.url === "https://api.7tv.app/v4/gql"));
  assert.deepEqual(
    requests.map((r) => (r.body.variables as { sort: unknown }).sort),
    [
      { sortBy: "TOP_ALL_TIME", order: "DESCENDING" },
      { sortBy: "UPLOAD_DATE", order: "DESCENDING" },
      { sortBy: "TRENDING_DAILY", order: "DESCENDING" },
      { sortBy: "NAME_ALPHABETICAL", order: "ASCENDING" },
      { sortBy: "NAME_ALPHABETICAL", order: "DESCENDING" },
    ],
  );
});

test("7TV maps response files, author, count and page boundary", async () => {
  const fetcher: typeof fetch = async () =>
    Response.json({
      data: {
        emotes: {
          search: {
            totalCount: 101,
            pageCount: 2,
            items: [
              {
                id: "one",
                defaultName: "cat",
                flags: { animated: true },
                owner: { mainConnection: { platformDisplayName: "author" } },
                images: [
                  {
                    url: "https://cdn.7tv.app/emote/one/4x.webp",
                    mime: "image/webp",
                    width: 128,
                    height: 128,
                  },
                  {
                    url: "https://cdn.7tv.app/emote/one/2x.gif",
                    mime: "image/gif",
                    width: 64,
                    height: 64,
                  },
                ],
              },
            ],
          },
        },
      },
    });
  const result = await searchEmotes(
    {
      provider: "7tv",
      sort: "recent",
      query: "",
      page: 2,
      animatedOnly: false,
    },
    undefined,
    fetcher,
  );
  assert.equal(result.total, 101);
  assert.equal(result.hasMore, false);
  assert.equal(result.items[0].owner?.display_name, "author");
  assert.equal(getEmoteFile(result.items[0], 4).ext, "gif");
});

test("legacy favorites keep identity and pick GIF/PNG before WebP", () => {
  const old: Emote = {
    id: "one",
    name: "cat",
    animated: true,
    host: {
      url: "//cdn.7tv.app/emote/one",
      files: [
        { name: "4x.webp", width: 128, height: 128, format: "WEBP" },
        { name: "2x.gif", width: 64, height: 64, format: "GIF" },
      ],
    },
  };
  assert.equal(getEmoteKey(old), "7tv:one");
  assert.deepEqual(getEmoteFile(old, 4), {
    url: "https://cdn.7tv.app/emote/one/2x.gif",
    ext: "gif",
  });
  assert.notEqual(getEmoteKey(old), getEmoteKey({ ...old, provider: "ffz" }));
});

test("BetterTTV uses server search pagination and keeps totals unknown", async () => {
  let requested = "";
  const fetcher: typeof fetch = async (url) => {
    requested = String(url);
    return Response.json([
      { id: "b", code: "dance", animated: true, imageType: "gif" },
    ]);
  };
  const r = await searchEmotes(
    {
      provider: "bttv",
      sort: "popular",
      query: "dance",
      page: 2,
      animatedOnly: false,
    },
    undefined,
    fetcher,
  );
  assert.match(requested, /offset=50/);
  assert.equal(r.total, undefined);
  assert.equal(r.hasMore, false);
  assert.equal(getEmoteFile(r.items[0], 4).ext, "gif");
});

test("FFZ chooses actual GIF endpoint instead of animated WebP", async () => {
  const fetcher: typeof fetch = async () =>
    Response.json({
      _total: 1,
      _pages: 1,
      emoticons: [
        {
          id: 724094,
          name: "Dance",
          height: 28,
          width: 28,
          urls: { "1": "https://cdn.frankerfacez.com/emote/724094/1" },
          animated: {
            "4": "https://cdn.frankerfacez.com/emote/724094/animated/4",
          },
        },
      ],
    });
  const r = await searchEmotes(
    {
      provider: "ffz",
      sort: "popular",
      query: "dance",
      page: 1,
      animatedOnly: true,
    },
    undefined,
    fetcher,
  );
  assert.deepEqual(getEmoteFile(r.items[0], 4), {
    url: "https://cdn.frankerfacez.com/emote/724094/animated/4.gif",
    ext: "gif",
  });
  assert.equal(r.total, 1);
});

test("API failure is surfaced rather than silently showing old results", async () => {
  await assert.rejects(
    searchEmotes(
      {
        provider: "7tv",
        sort: "popular",
        query: "",
        page: 1,
        animatedOnly: false,
      },
      undefined,
      async () => Response.json({ errors: [{ message: "Unavailable" }] }),
    ),
    /Unavailable/,
  );
});

test("BetterTTV ranked browsing uses its returned cursor, not numeric offset", async () => {
  const urls: string[] = [];
  const fetcher: typeof fetch = async (url) => {
    urls.push(String(url));
    return Response.json(
      Array.from({ length: 50 }, (_, i) => ({
        id: `cursor-${i}`,
        emote: {
          id: `emote-${i}`,
          code: "dance",
          imageType: "gif",
          animated: true,
        },
      })),
    );
  };
  const first = await searchEmotes(
    {
      provider: "bttv",
      sort: "trending",
      query: "",
      page: 1,
      animatedOnly: false,
    },
    undefined,
    fetcher,
  );
  assert.equal(new URL(urls[0]).searchParams.has("offset"), false);
  assert.equal(first.nextCursor, "cursor-49");
  await searchEmotes(
    {
      provider: "bttv",
      sort: "trending",
      query: "",
      page: 2,
      animatedOnly: false,
      cursor: first.nextCursor,
    },
    undefined,
    fetcher,
  );
  assert.equal(new URL(urls[1]).searchParams.get("before"), "cursor-49");
});

test("static legacy emotes select the largest actual PNG", () => {
  const e: Emote = {
    id: "static",
    name: "Prayge",
    animated: false,
    host: {
      url: "//cdn.7tv.app/emote/static",
      files: [
        { name: "4x.webp", format: "WEBP", width: 128, height: 128 },
        { name: "2x.png", format: "PNG", width: 64, height: 64 },
        { name: "4x.png", format: "PNG", width: 128, height: 128 },
      ],
    },
  };
  assert.equal(
    getEmoteFile(e, 4).url,
    "https://cdn.7tv.app/emote/static/4x.png",
  );
});

test("size picks the largest file at or below it, else the smallest above", () => {
  const gifs = (...scales: number[]): Emote => ({
    id: "e",
    name: "e",
    animated: true,
    host: {
      url: "//cdn.7tv.app/emote/e",
      files: scales.map((s) => ({
        name: `${s}x.gif`,
        format: "GIF",
        width: 32 * s,
        height: 32 * s,
      })),
    },
  });
  const pick = (e: Emote, size: number) =>
    getEmoteFile(e, size).url.split("/").pop();
  assert.equal(pick(gifs(1, 2, 3, 4), 2), "2x.gif");
  assert.equal(pick(gifs(1, 2, 3), 4), "3x.gif"); // BetterTTV stops at 3x
  assert.equal(pick(gifs(1, 2, 4), 3), "2x.gif"); // FrankerFaceZ has no 3x
  assert.equal(pick(gifs(2, 4), 1), "2x.gif");
});
