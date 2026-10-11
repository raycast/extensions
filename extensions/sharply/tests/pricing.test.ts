import assert from "node:assert/strict";
import { test } from "node:test";
import { formatUsedPrice } from "../src/pricing";

test("prices select matching market and currency without converting or falling back", () => {
  const prices = { US: 10000, UK: 8000, EU: 9000 };
  assert.equal(formatUsedPrice(prices, "US"), "~$100.00");
  assert.equal(formatUsedPrice(prices, "UK"), "~£80.00");
  assert.equal(formatUsedPrice(prices, "EU"), "~€90.00");
  assert.equal(formatUsedPrice({ US: 10000 }, "UK", 10000), undefined);
  assert.equal(formatUsedPrice(undefined, "US", 10000), "~$100.00");
  assert.equal(formatUsedPrice({ UK: 0 }, "UK"), undefined);
});
