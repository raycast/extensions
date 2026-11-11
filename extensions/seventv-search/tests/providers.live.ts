import assert from "node:assert/strict";
import { test } from "node:test";
import { searchEmotes, getEmoteFile, PROVIDERS } from "../src/providers.ts";

for (const provider of PROVIDERS) {
  for (const sort of provider.sorts) {
    test(`${provider.title} ${sort} returns distinct pages`, async () => {
      const args = {
        provider: provider.id,
        sort,
        query: provider.id === "ffz" ? "dance" : "",
        page: 1,
        animatedOnly: false,
      };
      const first = await searchEmotes(args, AbortSignal.timeout(20000));
      assert.ok(first.items.length > 0);
      assert.equal(first.hasMore, true);
      const second = await searchEmotes(
        { ...args, page: 2, cursor: first.nextCursor },
        AbortSignal.timeout(20000),
      );
      assert.ok(second.items.length > 0);
      assert.notEqual(first.items[0].id, second.items[0].id);
    });
  }
  test(`${provider.title} animated search downloads a GIF`, async () => {
    const result = await searchEmotes(
      {
        provider: provider.id,
        sort: "popular",
        query: provider.id === "7tv" ? "catJAM" : "dance",
        page: 1,
        animatedOnly: true,
      },
      AbortSignal.timeout(20000),
    );
    assert.ok(result.items.length > 0);
    assert.ok(result.items.every((e) => e.animated));
    const file = getEmoteFile(result.items[0], 4);
    assert.equal(file.ext, "gif");
    const response = await fetch(file.url, {
      signal: AbortSignal.timeout(20000),
    });
    assert.equal(response.status, 200);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.match(bytes.subarray(0, 6).toString(), /^GIF8[79]a$/);
  });
}
