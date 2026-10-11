import assert from "node:assert/strict";
import { test } from "node:test";
import { gearUrl, searchGear, usedPrice } from "../src/catalog";

test("search uses the public endpoint, encodes queries, and validates results", async () => {
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async (input, options) => {
    requests++;
    const url = new URL(String(input));
    assert.equal(url.pathname, "/api/search");
    assert.equal(url.searchParams.get("q"), "Nikon Z6 & lens");
    assert.equal(options?.headers, undefined);
    return Response.json({
      results: [
        {
          slug: "nikon-z6",
          name: "Nikon Z6",
          gearType: "CAMERA",
          brandName: "Nikon",
          thumbnailUrl: null,
          msrpNowUsdCents: 77900,
          usedPriceProjection: { US: { typical: 68500, status: "current" } },
        },
      ],
    });
  };
  try {
    assert.deepEqual(await searchGear("n"), []);
    assert.equal(requests, 0);
    const results = await searchGear(" Nikon Z6 & lens ");
    assert.equal(results[0].name, "Nikon Z6");
    assert.equal(results[0].estimatedUsedUsdCents, 68500);
    assert.equal(
      gearUrl("nikon-z6"),
      "https://www.sharplyphoto.com/gear/nikon-z6",
    );
    globalThis.fetch = async () => Response.json({ results: [{}] });
    await assert.rejects(searchGear("nikon"), /invalid gear item/);
    globalThis.fetch = async () =>
      new Response("checkpoint", { headers: { "content-type": "text/html" } });
    await assert.rejects(searchGear("nikon"), /security checkpoint/);
    globalThis.fetch = async () => new Response("", { status: 429 });
    await assert.rejects(searchGear("nikon"), /request limit/);
  } finally {
    globalThis.fetch = original;
  }
});

test("used prices never fall back to MSRP or unavailable estimates", () => {
  assert.equal(usedPrice({ msrpNowUsdCents: 77900 }), null);
  assert.equal(
    usedPrice({
      usedPriceProjection: { EU: { typical: 50000, status: "current" } },
    }),
    null,
  );
  assert.equal(
    usedPrice({
      usedPriceProjection: { US: { typical: 0, status: "current" } },
    }),
    null,
  );
  assert.equal(
    usedPrice({
      usedPriceProjection: { US: { typical: 50000, status: "unavailable" } },
    }),
    null,
  );
  assert.equal(
    usedPrice({
      usedPriceProjection: { US: { typical: 50000, status: "stale" } },
    }),
    50000,
  );
});
