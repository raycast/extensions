import assert from "node:assert/strict";
import test from "node:test";

import { parseDeepSeekBalance } from "./fetcher.ts";

test("parseDeepSeekBalance parses a funded USD balance", () => {
  const result = parseDeepSeekBalance({
    is_available: true,
    balance_infos: [
      {
        currency: "USD",
        total_balance: "50.00",
        granted_balance: "10.00",
        topped_up_balance: "40.00",
      },
    ],
  });

  assert.deepEqual(result, {
    usage: {
      isAvailable: true,
      currency: "USD",
      totalBalance: 50,
      grantedBalance: 10,
      toppedUpBalance: 40,
    },
    error: null,
  });
});

test("parseDeepSeekBalance prefers a positive CNY balance over an empty USD balance", () => {
  const result = parseDeepSeekBalance({
    is_available: true,
    balance_infos: [
      { currency: "USD", total_balance: "0", granted_balance: "0", topped_up_balance: "0" },
      { currency: "CNY", total_balance: "100", granted_balance: "10", topped_up_balance: "90" },
    ],
  });

  assert.equal(result.usage?.currency, "CNY");
  assert.equal(result.usage?.totalBalance, 100);
});

test("parseDeepSeekBalance returns an unavailable zero balance when the API has no balance rows", () => {
  const result = parseDeepSeekBalance({ is_available: false, balance_infos: [] });

  assert.deepEqual(result.usage, {
    isAvailable: false,
    currency: "USD",
    totalBalance: 0,
    grantedBalance: 0,
    toppedUpBalance: 0,
  });
});

test("parseDeepSeekBalance rejects malformed balance values", () => {
  const result = parseDeepSeekBalance({
    is_available: true,
    balance_infos: [{ currency: "USD", total_balance: "not-a-number", granted_balance: "0", topped_up_balance: "0" }],
  });

  assert.equal(result.usage, null);
  assert.equal(result.error?.type, "parse_error");
});

test("parseDeepSeekBalance rejects missing balance values instead of coercing them to zero", () => {
  const result = parseDeepSeekBalance({
    is_available: true,
    balance_infos: [{ currency: "USD", total_balance: null, granted_balance: "0", topped_up_balance: "0" }],
  });

  assert.equal(result.usage, null);
  assert.equal(result.error?.type, "parse_error");
});
