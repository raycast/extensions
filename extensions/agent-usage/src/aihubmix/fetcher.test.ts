import assert from "node:assert/strict";
import test from "node:test";

import { parseAihubmixSelf } from "./fetcher.ts";

test("parseAihubmixSelf converts quota units to USD", () => {
  const result = parseAihubmixSelf({
    success: true,
    message: "",
    data: {
      username: "alice",
      display_name: "Alice",
      quota: 412192,
      used_quota: 3087808,
      request_count: 4367,
    },
  });

  assert.equal(result.error, null);
  assert.equal(result.usage?.username, "Alice");
  assert.equal(result.usage?.requestCount, 4367);
  assert.equal(result.usage?.remainingUsd.toFixed(2), "0.82");
  assert.equal(result.usage?.usedUsd.toFixed(2), "6.18");
});

test("parseAihubmixSelf treats unsuccessful payloads as unauthorized", () => {
  const result = parseAihubmixSelf({
    success: false,
    message: "Unauthorized – access token is invalid or expired.",
  });

  assert.equal(result.usage, null);
  assert.equal(result.error?.type, "unauthorized");
});

test("parseAihubmixSelf rejects missing quota values", () => {
  const result = parseAihubmixSelf({
    success: true,
    data: { username: "alice", used_quota: 0 },
  });

  assert.equal(result.usage, null);
  assert.equal(result.error?.type, "parse_error");
});
