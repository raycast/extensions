import test from "node:test";
import assert from "node:assert/strict";

test("parseCodexResetCreditsResponse returns available credits sorted by expiration", async () => {
  const { parseCodexResetCreditsResponse } = await import("./fetcher");

  const result = parseCodexResetCreditsResponse({
    available_count: 2,
    credits: [
      {
        id: "later",
        status: "available",
        expires_at: "2026-07-27T00:05:33.936875Z",
      },
      {
        id: "used",
        status: "consumed",
        expires_at: "2026-07-20T00:05:33.936875Z",
      },
      {
        id: "earlier",
        status: "available",
        expires_at: "2026-07-18T00:44:44.314142Z",
      },
    ],
  });

  assert.deepEqual(result, {
    availableCount: 2,
    credits: [
      {
        id: "earlier",
        expiresAt: "2026-07-18T00:44:44.314142Z",
      },
      {
        id: "later",
        expiresAt: "2026-07-27T00:05:33.936875Z",
      },
    ],
  });
});

test("parseCodexResetCreditsResponse falls back to listed credits count", async () => {
  const { parseCodexResetCreditsResponse } = await import("./fetcher");

  const result = parseCodexResetCreditsResponse({
    credits: [
      {
        expires_at: "2026-07-18T00:44:44.314142Z",
      },
    ],
  });

  assert.equal(result?.availableCount, 1);
  assert.equal(result?.credits.length, 1);
});
