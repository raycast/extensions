import assert from "node:assert/strict";
import test from "node:test";

import type { HttpFetchOptions, HttpFetchResult } from "../agents/http.ts";
import {
  fetchAnthropicApiUsage,
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

/** A Console stand-in keyed by URL path that answers like `httpFetch`, recording each request. */
function fakeConsole(routes: Record<string, { status: number; data?: unknown }>) {
  const requested: string[] = [];
  const request = async (options: HttpFetchOptions): Promise<HttpFetchResult> => {
    const path = new URL(options.url).pathname;
    requested.push(path);
    const route = routes[path] ?? { status: 404 };
    if (route.status === 401) {
      return { data: null, error: { type: "unauthorized", message: options.unauthorizedMessage ?? "" }, status: 401 };
    }
    if (route.status === 403 && options.forbiddenMessage) {
      return { data: null, error: { type: "unauthorized", message: options.forbiddenMessage }, status: 403 };
    }
    if (route.status >= 400) {
      return { data: null, error: { type: "unknown", message: `HTTP ${route.status}` }, status: route.status };
    }
    return { data: route.data, error: null, status: route.status };
  };
  return { request, requested };
}

const apiOrganizations = {
  status: 200,
  data: [
    { uuid: "org-1", name: "Denied", capabilities: ["api"] },
    { uuid: "org-2", name: "Readable", capabilities: ["api"] },
  ],
};

test("fetchAnthropicApiUsage moves past an organization whose billing is denied", async () => {
  const { request, requested } = fakeConsole({
    "/api/organizations": apiOrganizations,
    "/api/organizations/org-1/prepaid/credits": { status: 403 },
    "/api/organizations/org-2/prepaid/credits": { status: 200, data: { amount: 5000, currency: "USD" } },
    "/api/organizations/org-2/current_spend": { status: 200, data: { amount: 125 } },
  });

  const result = await fetchAnthropicApiUsage("sessionKey=sk-ant-sid01-abc", request);

  assert.equal(result.error, null);
  assert.equal(result.usage?.organizationName, "Readable");
  assert.equal(result.usage?.balance, 50);
  assert.equal(result.usage?.monthToDateSpend, 1.25);
  assert.deepEqual(requested, [
    "/api/organizations",
    "/api/organizations/org-1/prepaid/credits",
    "/api/organizations/org-2/prepaid/credits",
    "/api/organizations/org-2/current_spend",
  ]);
});

test("fetchAnthropicApiUsage reports denied billing, not an expired session, when no organization is readable", async () => {
  const { request, requested } = fakeConsole({
    "/api/organizations": apiOrganizations,
    "/api/organizations/org-1/prepaid/credits": { status: 403 },
    "/api/organizations/org-2/prepaid/credits": { status: 403 },
  });

  const result = await fetchAnthropicApiUsage("sessionKey=sk-ant-sid01-abc", request);

  assert.equal(result.usage, null);
  assert.equal(result.error?.type, "billing_denied");
  assert.equal(requested.includes("/api/organizations/org-2/current_spend"), false);
});

test("fetchAnthropicApiUsage keeps the balance when the optional spend request fails", async () => {
  const { request } = fakeConsole({
    "/api/organizations": { status: 200, data: [{ uuid: "org-1", name: "Personal", capabilities: ["api"] }] },
    "/api/organizations/org-1/prepaid/credits": { status: 200, data: { amount: 1999, currency: "USD" } },
    "/api/organizations/org-1/current_spend": { status: 500 },
  });

  const result = await fetchAnthropicApiUsage("sessionKey=sk-ant-sid01-abc", request);

  assert.equal(result.error, null);
  assert.equal(result.usage?.balance, 19.99);
  assert.equal(result.usage?.monthToDateSpend, null);
});

test("fetchAnthropicApiUsage treats a rejected organization list as an expired session", async () => {
  const { request, requested } = fakeConsole({ "/api/organizations": { status: 403 } });

  const result = await fetchAnthropicApiUsage("sessionKey=sk-ant-sid01-expired", request);

  assert.equal(result.error?.type, "unauthorized");
  assert.match(result.error?.message ?? "", /session expired/i);
  assert.deepEqual(requested, ["/api/organizations"]);
});

test("fetchAnthropicApiUsage asks for a Console organization when the account only has chat organizations", async () => {
  const { request } = fakeConsole({
    "/api/organizations": { status: 200, data: [{ uuid: "chat-org", name: "Chat", capabilities: ["chat"] }] },
  });

  const result = await fetchAnthropicApiUsage("sessionKey=sk-ant-sid01-abc", request);

  assert.equal(result.error?.type, "not_configured");
});
