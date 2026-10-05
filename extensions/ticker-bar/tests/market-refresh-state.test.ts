import assert from "node:assert/strict";
import test from "node:test";
import { retainCurrentRecords } from "../src/market-refresh-state";

test("a full refresh retains current additions and removes deleted assets", () => {
  const latest = {
    "stock:SPY": "latest SPY",
    "crypto:bitcoin": "latest BTC",
    "stock:AAPL": "added during refresh",
  };

  assert.deepEqual(retainCurrentRecords(latest, ["stock:SPY", "stock:AAPL"]), {
    "stock:SPY": "latest SPY",
    "stock:AAPL": "added during refresh",
  });
});

test("an explicit asset refresh preserves records outside the request", () => {
  const latest = {
    "stock:SPY": "latest SPY",
    "crypto:bitcoin": "latest BTC",
  };

  assert.deepEqual(retainCurrentRecords(latest), latest);
  assert.notEqual(retainCurrentRecords(latest), latest);
});
