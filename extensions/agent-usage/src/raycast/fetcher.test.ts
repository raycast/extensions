import assert from "node:assert/strict";
import test from "node:test";

import { normalizeRaycastCookieHeader, parseRaycastCredits } from "./fetcher.ts";

test("parseRaycastCredits maps the monthly allowance, renewal date, and plan", () => {
  const result = parseRaycastCredits({
    remaining_balance_credits: "125",
    total_balance_credits: "500",
    next_credits_at: "2026-10-18T00:00:00.000Z",
    can_top_up: true,
    funding_subscription: { tier: "pro", status: "active" },
  });

  assert.deepEqual(result, {
    usage: {
      plan: "Pro",
      remainingCredits: 125,
      totalCredits: 500,
      percentageRemaining: 25,
      nextCreditsAt: "2026-10-18T00:00:00.000Z",
    },
    error: null,
  });
});

test("parseRaycastCredits accepts decimal strings and numbers", () => {
  const decimal = parseRaycastCredits({ remaining_balance_credits: "337.3751", total_balance_credits: "500.0" });
  assert.equal(decimal.usage?.remainingCredits, 337.3751);
  assert.ok(Math.abs((decimal.usage?.percentageRemaining ?? 0) - 67.475) < 0.001);

  const numeric = parseRaycastCredits({
    remaining_balance_credits: 12.5,
    total_balance_credits: 50,
    funding_subscription: { tier: "pro_plus" },
  });
  assert.equal(numeric.usage?.percentageRemaining, 25);
  assert.equal(numeric.usage?.plan, "Pro+");
});

test("parseRaycastCredits caps rollover balances above the grant at 100% remaining", () => {
  const result = parseRaycastCredits({ remaining_balance_credits: "750", total_balance_credits: "500" });

  assert.equal(result.usage?.remainingCredits, 750);
  assert.equal(result.usage?.percentageRemaining, 100);
});

test("parseRaycastCredits leaves the percentage unknown for a zero allowance", () => {
  const result = parseRaycastCredits({
    remaining_balance_credits: "0",
    total_balance_credits: "0",
    funding_subscription: { tier: "max" },
  });

  assert.equal(result.usage?.percentageRemaining, null);
  assert.equal(result.usage?.totalCredits, 0);
  assert.equal(result.usage?.plan, "Max");
});

test("parseRaycastCredits turns any tier id into a readable plan label", () => {
  const planFor = (tier: unknown): string | null | undefined =>
    parseRaycastCredits({ remaining_balance_credits: "1", funding_subscription: { tier } }).usage?.plan;

  assert.equal(planFor("pro"), "Pro");
  assert.equal(planFor("pro_plus"), "Pro+");
  assert.equal(planFor("max"), "Max");
  assert.equal(planFor("team"), "Team");
  assert.equal(planFor("team_pro"), "Team Pro");
  assert.equal(planFor("  "), null);
  assert.equal(planFor(5), null);
});

test("parseRaycastCredits rejects malformed amounts instead of reporting zero", () => {
  for (const value of [true, "NaN", "Infinity", "", [], {}, "-5", -5]) {
    const result = parseRaycastCredits({ remaining_balance_credits: value, total_balance_credits: "500" });
    assert.equal(result.usage, null, `value ${JSON.stringify(value)}`);
    assert.equal(result.error?.type, "parse_error");
  }
});

test("parseRaycastCredits rejects responses without credit amounts", () => {
  for (const body of [null, [], {}, { funding_subscription: {} }]) {
    assert.equal(parseRaycastCredits(body).error?.type, "parse_error");
  }
});

test("parseRaycastCredits rejects an invalid renewal date", () => {
  const result = parseRaycastCredits({
    remaining_balance_credits: "1",
    total_balance_credits: "2",
    next_credits_at: 5,
  });
  assert.equal(result.error?.type, "parse_error");
});

test("normalizeRaycastCookieHeader keeps only the session and csrf cookies", () => {
  assert.equal(
    normalizeRaycastCookieHeader("Cookie: _ga=1; __raycast_session=abc%3D--def; csrf_token=xyz; other=2"),
    "__raycast_session=abc%3D--def; csrf_token=xyz",
  );
});

test("normalizeRaycastCookieHeader treats a bare value as the session cookie", () => {
  assert.equal(normalizeRaycastCookieHeader("  abc%3D--def  "), "__raycast_session=abc%3D--def");
});

test("normalizeRaycastCookieHeader keeps a bare value that contains `=`", () => {
  assert.equal(normalizeRaycastCookieHeader("YWJj==--ZGVm=="), "__raycast_session=YWJj==--ZGVm==");
  assert.equal(normalizeRaycastCookieHeader("__raycast_session=YWJj=="), "__raycast_session=YWJj==");
});

test("normalizeRaycastCookieHeader rejects headers without a usable session", () => {
  assert.equal(normalizeRaycastCookieHeader(undefined), null);
  assert.equal(normalizeRaycastCookieHeader("   "), null);
  assert.equal(normalizeRaycastCookieHeader("csrf_token=only"), null);
  assert.equal(normalizeRaycastCookieHeader("__raycast_session=; csrf_token=xyz"), null);
});
