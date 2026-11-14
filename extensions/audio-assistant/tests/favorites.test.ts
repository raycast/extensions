import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { LiveMusicService } from "../src/services/live";
import { DemoMusicService } from "../src/services/demo";
import { SearchPager, type PagerState } from "../src/services/search-pager";
import type { SearchPage } from "../src/domain/model";
import { itemKey } from "../src/domain/policy";
import { requireFavorite } from "../src/services/wire";

const kinds = ["tracks", "artists", "albums"] as const;
function fixture(kind: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(__dirname, "fixtures", `${kind}.json`), "utf8"))[0];
}
function source(kind: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    ...fixture(kind),
    item_id: `${kind}-${i}`,
    uri: `library://${kind}/${i}`,
    favorite: true,
  }));
}

test("Favorites sends verified favorite/search arguments and pages all three sources to exhaustion", async () => {
  const data = { tracks: source("tracks", 7), artists: source("artists", 6), albums: source("albums", 3) };
  const calls: { kind: string; offset: number }[] = [];
  const abort = new AbortController();
  const live = new LiveMusicService({
    serverUrl: "https://fixture.invalid",
    client: {
      command: async (command, args = {}, signal) => {
        assert.equal(signal, abort.signal);
        const kind = kinds.find((k) => command === `music/${k}/library_items`);
        assert.ok(kind, "Never use provider search or player queries for Favorites");
        assert.deepEqual(Object.keys(args).sort(), ["favorite", "limit", "offset", "search", "summary"]);
        assert.equal(args.favorite, true);
        assert.equal(args.summary, false);
        assert.equal(args.search, "typed query");
        assert.equal(args.limit, 2);
        const offset = Number(args.offset);
        calls.push({ kind, offset });
        return data[kind].slice(offset, offset + 2);
      },
    },
  });
  const items: SearchPage["items"] = [];
  let cursor: string | undefined;
  do {
    const page = await live.search({ view: "favorites", query: "typed query", limit: 2, cursor }, abort.signal);
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  assert.equal(items.length, 16);
  assert.equal(new Set(items.map(itemKey)).size, 16);
  assert.equal(items.filter((i) => i.kind === "artist").length, 6, "No five-artist cap");
  assert.deepEqual(
    calls.filter((c) => c.kind === "albums").map((c) => c.offset),
    [0, 2],
  );
  assert.deepEqual(
    calls.filter((c) => c.kind === "artists").map((c) => c.offset),
    [0, 2, 4, 6],
  );
});

test("Favorites preserves healthy pages and warnings without automatically retrying failed sources", async () => {
  let failedCalls = 0;
  const live = new LiveMusicService({
    serverUrl: "https://fixture.invalid",
    client: {
      command: async (command, args = {}) => {
        if (command.includes("artists")) {
          failedCalls++;
          throw new Error("private response text");
        }
        const kind = command.includes("tracks") ? "tracks" : "albums";
        return source(kind, 3).slice(Number(args.offset), Number(args.offset) + 2);
      },
    },
  });
  let state: PagerState | undefined;
  const pager = new SearchPager(
    (request, signal) => live.search(request, signal),
    { view: "favorites", query: "", limit: 2 },
    (next) => {
      state = next;
    },
  );
  await pager.loadMore();
  await pager.loadMore();
  assert.equal(state!.items.length, 6);
  assert.equal(state!.hasMore, false);
  assert.equal(failedCalls, 1);
  assert.equal(state!.warnings?.length, 1);
  assert.match(state!.warnings![0]!, /Favorite artists/);
  assert.ok(!JSON.stringify(state).includes("private response"));
});

test("Favorites distinguishes total failures, non-favorites, malformed flags and empty libraries", async () => {
  for (const flag of [false, "true", undefined]) {
    assert.throws(() => requireFavorite({ favorite: flag }, "test"), /confirmed favorite/);
    const live = new LiveMusicService({
      serverUrl: "https://fixture.invalid",
      client: {
        command: async (command) => {
          const kind = kinds.find((k) => command.includes(k))!;
          return [{ ...fixture(kind), favorite: flag }];
        },
      },
    });
    await assert.rejects(live.search({ view: "favorites", query: "", limit: 10 }), /Could not load Favorites/);
  }
  const empty = new LiveMusicService({ serverUrl: "https://fixture.invalid", client: { command: async () => [] } });
  assert.deepEqual((await empty.search({ view: "favorites", query: "", limit: 10 })).items, []);
});

test("a repeated server page stops instead of offering endless Favorites pagination", async () => {
  const live = new LiveMusicService({
    serverUrl: "https://fixture.invalid",
    client: {
      command: async (command) =>
        source(
          kinds.find((k) => command.includes(k))!,
          2,
        ),
    },
  });
  let state: PagerState | undefined;
  const pager = new SearchPager(
    (request, signal) => live.search(request, signal),
    { view: "favorites", query: "", limit: 2 },
    (next) => {
      state = next;
    },
  );
  await pager.loadMore();
  assert.equal(state!.items.length, 6);
  await pager.loadMore();
  assert.ok(state!.error);
  assert.equal(state!.items.length, 6);
  pager.dispose();
});

test("Favorites rejects corrupt cursors and honors cancellation before making requests", async () => {
  let calls = 0;
  const live = new LiveMusicService({
    serverUrl: "https://fixture.invalid",
    client: {
      command: async () => {
        calls++;
        return [];
      },
    },
  });
  for (const cursor of [
    "[]",
    '{"tracks":{"offset":"-1"}}',
    '{"tracks":{"offset":"1","previous":3}}',
    '{"artists":2}',
  ]) {
    await assert.rejects(live.search({ view: "favorites", query: "", limit: 2, cursor }));
  }
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(live.search({ view: "favorites", query: "", limit: 2 }, abort.signal));
  assert.equal(calls, 0);
});

test("changing favorite membership is visible to a fresh search without retaining an old cursor", async () => {
  let favorite = true;
  const live = new LiveMusicService({
    serverUrl: "https://fixture.invalid",
    client: { command: async (command) => (favorite && command.includes("tracks") ? source("tracks", 1) : []) },
  });
  assert.equal((await live.search({ view: "favorites", query: "", limit: 2 })).items.length, 1);
  favorite = false;
  assert.equal((await live.search({ view: "favorites", query: "", limit: 2 })).items.length, 0);
});

test("Demo Favorites contains only deterministic marked media and supports paging and search", async () => {
  const demo = new DemoMusicService();
  const all = await demo.search({ view: "favorites", query: "", limit: 100 });
  assert.equal(all.items.length, 5);
  assert.ok(all.items.every((i) => i.kind !== "player" && i.favorite === true));
  const first = await demo.search({ view: "favorites", query: "", limit: 2 });
  const next = await demo.search({ view: "favorites", query: "", limit: 2, cursor: first.nextCursor });
  assert.equal(new Set([...first.items, ...next.items].map(itemKey)).size, 4);
  assert.equal((await demo.search({ view: "favorites", query: "not a favorite name", limit: 100 })).items.length, 0);
  const name = all.items[0]!.name;
  assert.equal((await demo.search({ view: "favorites", query: name, limit: 100 })).items[0]?.name, name);
});
