import assert from "node:assert/strict";
import { test } from "node:test";
import {
  searchSevenTVUsers,
  createSevenTVUserSource,
  getUsageDescription,
} from "../src/user-emotes.ts";

const user = {
  id: "user-1",
  name: "Creator",
  handle: "creator",
  platform: "TWITCH",
};
const raw = (id: string, name = id, flags: Record<string, boolean> = {}) => ({
  id,
  defaultName: name,
  flags: { animated: true, private: false, publicListed: true, ...flags },
  owner: { mainConnection: { platformDisplayName: "artist" } },
  images: [
    {
      url: `https://cdn.7tv.app/emote/${id}/2x.gif`,
      mime: "image/gif",
      width: 64,
      height: 64,
    },
  ],
});
function fake(reply: (body: any) => unknown): typeof fetch {
  return (async (_url, init) =>
    new Response(
      JSON.stringify({ data: reply(JSON.parse(String(init?.body))) }),
      { status: 200 },
    )) as typeof fetch;
}
const args = {
  provider: "7tv" as const,
  sort: "popular" as const,
  query: "",
  page: 1,
  animatedOnly: false,
};

test("user search maps stable identity and pagination and avoids empty requests", async () => {
  let calls = 0;
  const fetcher = fake((body) => {
    calls++;
    assert.equal(body.variables.query, "creator");
    return {
      users: {
        search: {
          totalCount: 61,
          pageCount: 2,
          items: [
            {
              id: "u",
              mainConnection: {
                platformUsername: "creator",
                platformDisplayName: "Creator",
                platform: "TWITCH",
                platformAvatarUrl: "https://example.com/avatar.png",
              },
            },
          ],
        },
      },
    };
  });
  assert.equal(
    (await searchSevenTVUsers("   ", 1, undefined, fetcher)).items.length,
    0,
  );
  const result = await searchSevenTVUsers(" creator ", 1, undefined, fetcher);
  assert.equal(calls, 1);
  assert.equal(result.hasMore, true);
  assert.equal(result.items[0].id, "u");
  assert.equal(result.items[0].handle, "creator");
});

test("channel emotes preserve channel aliases, flags, native files and server pagination", async () => {
  const source = createSevenTVUserSource(
    user,
    "channel",
    fake((body) => {
      assert.equal(body.variables.page, 1);
      assert.equal(body.variables.query, "cat");
      return {
        users: {
          user: {
            style: {
              activeEmoteSet: {
                name: "Channel",
                emotes: {
                  totalCount: 75,
                  pageCount: 2,
                  items: [
                    {
                      alias: "channelCat",
                      emote: raw("1", "catJAM", { deniedPersonal: true }),
                    },
                  ],
                },
              },
            },
          },
        },
      };
    }),
  );
  const result = await source.load({ ...args, query: "cat" });
  assert.equal(result.items[0].name, "channelCat");
  assert.equal(result.items[0].usage?.deniedPersonal, true);
  assert.equal(result.items[0].host.files[0].name, "2x.gif");
  assert.equal(result.hasMore, true);
  assert.equal(result.nextCursor, "2");
});

test("channel filter advances past an empty animated page without skipping the next cursor", async () => {
  const pages: number[] = [];
  const source = createSevenTVUserSource(
    user,
    "channel",
    fake((body) => {
      const page = body.variables.page;
      pages.push(page);
      return {
        users: {
          user: {
            style: {
              activeEmoteSet: {
                name: "Channel",
                emotes: {
                  totalCount: 120,
                  pageCount: 3,
                  items: [
                    {
                      alias: "alias",
                      emote: raw(String(page), "emote", { animated: page > 1 }),
                    },
                  ],
                },
              },
            },
          },
        },
      };
    }),
  );
  const result = await source.load({ ...args, animatedOnly: true });
  assert.deepEqual(pages, [1, 2]);
  assert.equal(result.items[0].id, "2");
  assert.equal(result.nextCursor, "3");
  assert.equal(result.total, undefined);
});

test("creator uploads are cached, filtered and image details fetched only for visible matches", async () => {
  let metadataCalls = 0;
  let detailsCalls = 0;
  const source = createSevenTVUserSource(
    user,
    "creator",
    fake((body) => {
      if (body.query.includes("ownedEmotes")) {
        metadataCalls++;
        return {
          users: {
            user: {
              ownedEmotes: [
                raw("cat", "CatDance"),
                raw("dog", "DogDance"),
                raw("private", "CatPrivate", { private: true }),
                raw("hidden", "CatHidden", { publicListed: false }),
              ],
            },
          },
        };
      }
      detailsCalls++;
      assert.deepEqual(body.variables, { id0: "cat" });
      return { emotes: { e0: raw("cat", "CatDance") } };
    }),
  );
  const result = await source.load({ ...args, query: " CAT " });
  assert.equal(result.total, 1);
  assert.equal(result.items[0].id, "cat");
  assert.equal(result.hasMore, false);
  await source.load({ ...args, query: "missing" });
  assert.equal(metadataCalls, 1);
  assert.equal(detailsCalls, 1);
});

test("no active set and empty creator account return an empty result rather than another user's emotes", async () => {
  const channel = createSevenTVUserSource(
    user,
    "channel",
    fake(() => ({ users: { user: { style: { activeEmoteSet: null } } } })),
  );
  assert.deepEqual((await channel.load(args)).items, []);
  const creator = createSevenTVUserSource(
    user,
    "creator",
    fake(() => ({ users: { user: { ownedEmotes: [] } } })),
  );
  assert.equal((await creator.load(args)).total, 0);
});

test("provider errors stay visible and failed upload metadata can be retried", async () => {
  let fail = true;
  const source = createSevenTVUserSource(
    user,
    "creator",
    (async () =>
      new Response(
        JSON.stringify(
          fail
            ? { errors: [{ message: "Temporarily unavailable" }] }
            : { data: { users: { user: { ownedEmotes: [] } } } },
        ),
      )) as typeof fetch,
  );
  await assert.rejects(source.load(args), /Temporarily unavailable/);
  fail = false;
  assert.equal((await source.load(args)).total, 0);
});

test("usage descriptions distinguish denied, approved and unknown personal-set status", () => {
  assert.match(getUsageDescription({ deniedPersonal: true }), /Denied/);
  assert.match(getUsageDescription({ approvedPersonal: true }), /Approved/);
  assert.match(
    getUsageDescription({ approvedPersonal: false, deniedPersonal: false }),
    /Not approved/,
  );
  assert.match(getUsageDescription(undefined), /not provided/i);
});

test("creator pages use bounded image batches and explicit reload refreshes metadata", async () => {
  let metadataLoads = 0;
  const sizes: number[] = [];
  const source = createSevenTVUserSource(
    user,
    "creator",
    fake((body) => {
      if (body.query.includes("ownedEmotes")) {
        metadataLoads++;
        return {
          users: {
            user: {
              ownedEmotes: Array.from({ length: 61 }, (_, i) => raw(String(i))),
            },
          },
        };
      }
      sizes.push(Object.keys(body.variables).length);
      return {
        emotes: Object.fromEntries(
          Object.entries(body.variables).map(([key, id]) => [
            key.replace("id", "e"),
            raw(String(id)),
          ]),
        ),
      };
    }),
  );
  const first = await source.load(args);
  assert.equal(first.items.length, 60);
  assert.deepEqual(sizes, [10, 10, 10, 10, 10, 10]);
  await source.load({ ...args, page: 2 });
  assert.equal(metadataLoads, 1);
  source.invalidate?.();
  await source.load({ ...args, query: "missing" });
  assert.equal(metadataLoads, 2);
});

test("blank channel query is omitted and hidden pages never produce an unfiltered total", async () => {
  const source = createSevenTVUserSource(
    user,
    "channel",
    fake((body) => {
      assert.equal(body.variables.query, null);
      const page = body.variables.page;
      return {
        users: {
          user: {
            style: {
              activeEmoteSet: {
                emotes: {
                  totalCount: 120,
                  pageCount: 2,
                  items: [
                    {
                      alias: "cat",
                      emote: raw(String(page), "cat", { private: page === 1 }),
                    },
                  ],
                },
              },
            },
          },
        },
      };
    }),
  );
  const result = await source.load(args);
  assert.equal(result.items.length, 1);
  assert.equal(result.total, undefined);
  assert.equal(result.hasMore, false);
});
