import assert from "node:assert/strict";
import test from "node:test";
import { searchTokens } from "../src/providers/dexscreener.ts";

test("uses artwork from another pool when the deepest pool omits it", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        pairs: [
          dexPair({ liquidity: 1_000_000 }),
          dexPair({
            liquidity: 100_000,
            imageUrl: "https://cdn.dexscreener.com/token.png",
          }),
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  try {
    const [result] = await searchTokens("token");
    assert.equal(result.imageUrl, "https://cdn.dexscreener.com/token.png");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function dexPair({
  liquidity,
  imageUrl,
}: {
  liquidity: number;
  imageUrl?: string;
}) {
  return {
    chainId: "base",
    dexId: "example",
    priceUsd: "1",
    liquidity: { usd: liquidity },
    baseToken: {
      address: "0x0000000000000000000000000000000000000001",
      name: "Token",
      symbol: "TKN",
    },
    info: imageUrl ? { imageUrl } : undefined,
  };
}
