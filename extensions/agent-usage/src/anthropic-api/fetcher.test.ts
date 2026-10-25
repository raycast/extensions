import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeAnthropicConsoleCookie,
  parseAnthropicCurrentSpend,
  parseAnthropicPrepaidCredits,
  parseConsoleOrganizations,
} from "./fetcher.ts";

const organization = { id: "org-1", name: "Personal" };
const now = Date.parse("2026-10-25T12:00:00Z");

test("normalizeAnthropicConsoleCookie treats a bare value as the sessionKey", () => {
  assert.equal(normalizeAnthropicConsoleCookie("  sk-ant-sid01-abc  "), "sessionKey=sk-ant-sid01-abc");
  assert.equal(normalizeAnthropicConsoleCookie(""), null);
  assert.equal(normalizeAnthropicConsoleCookie(undefined), null);
});

test("normalizeAnthropicConsoleCookie keeps only the session and active-organization cookies", () => {
  assert.equal(
    normalizeAnthropicConsoleCookie("Cookie: anthropic-device-id=x; sessionKey=sk-ant-sid01-abc; lastActiveOrg=org-2"),
    "sessionKey=sk-ant-sid01-abc; lastActiveOrg=org-2",
  );
  assert.equal(normalizeAnthropicConsoleCookie("lastActiveOrg=org-2; other=1"), null);
  assert.equal(normalizeAnthropicConsoleCookie("sessionKey=; lastActiveOrg=org-2"), null);
});

test("parseConsoleOrganizations keeps API organizations and puts the last active one first", () => {
  const organizations = parseConsoleOrganizations(
    [
      { uuid: "chat-org", name: "Chat", capabilities: ["chat"] },
      { uuid: "org-1", name: "Personal", capabilities: ["api", "chat"] },
      { uuid: "org-2", name: "Work", capabilities: ["api"] },
    ],
    "org-2",
  );

  assert.deepEqual(organizations, [
    { id: "org-2", name: "Work" },
    { id: "org-1", name: "Personal" },
  ]);
});

test("parseConsoleOrganizations rejects malformed responses", () => {
  assert.equal(parseConsoleOrganizations({}, null), null);
  assert.equal(parseConsoleOrganizations([{ uuid: "bad id/../", capabilities: ["api"] }], null), null);
  assert.deepEqual(parseConsoleOrganizations([], null), []);
});

test("parseAnthropicPrepaidCredits converts minor units and finds the soonest-expiring grant", () => {
  const result = parseAnthropicPrepaidCredits(
    {
      amount: 12345,
      currency: "USD",
      promo_tranches: [
        {
          name: "Max plan API credit",
          program_id: "subscription_api_credit",
          granted_amount_minor_units: 5000,
          remaining_amount_minor_units: 2500,
          expires_at: "2026-11-01T00:00:00Z",
        },
        // Already expired, and an exhausted grant: neither is "about to be lost".
        { remaining_amount_minor_units: 100, expires_at: "2026-10-01T00:00:00Z" },
        { remaining_amount_minor_units: 0, expires_at: "2026-10-26T00:00:00Z" },
      ],
      tranches: [{ remaining_amount_minor_units: 9845, expires_at: "2027-10-01T00:00:00Z" }],
    },
    organization,
    now,
  );

  assert.deepEqual(result, {
    usage: {
      organizationName: "Personal",
      currency: "USD",
      balance: 123.45,
      monthToDateSpend: null,
      nextExpiringGrant: { name: "Max plan API credit", remaining: 25, expiresAt: "2026-11-01T00:00:00.000Z" },
    },
    error: null,
  });
});

test("parseAnthropicPrepaidCredits honours a reported currency exponent", () => {
  const result = parseAnthropicPrepaidCredits(
    { amount: 1234567, currency: "EUR", balance: { credits: { exponent: 4 } } },
    organization,
    now,
  );

  assert.equal(result.usage?.balance, 123.4567);
  assert.equal(result.usage?.currency, "EUR");
  assert.equal(result.usage?.nextExpiringGrant, null);
});

test("parseAnthropicPrepaidCredits rejects malformed amounts", () => {
  assert.equal(parseAnthropicPrepaidCredits({ amount: "12" }, organization).error?.type, "parse_error");
  assert.equal(parseAnthropicPrepaidCredits({ amount: 1.5 }, organization).error?.type, "parse_error");
  assert.equal(parseAnthropicPrepaidCredits({ amount: 1, currency: "usd" }, organization).error?.type, "parse_error");
  assert.equal(parseAnthropicPrepaidCredits({ amount: 1, tranches: {} }, organization).error?.type, "parse_error");
  assert.equal(parseAnthropicPrepaidCredits(null, organization).error?.type, "parse_error");
});

test("parseAnthropicCurrentSpend reads month-to-date spend or reports it unavailable", () => {
  assert.equal(parseAnthropicCurrentSpend({ amount: 4210 }), 42.1);
  assert.equal(parseAnthropicCurrentSpend({ amount: 4210 }, 3), 4.21);
  assert.equal(parseAnthropicCurrentSpend({ amount: -1 }), null);
  assert.equal(parseAnthropicCurrentSpend({}), null);
});
