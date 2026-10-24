import { describe, expect, it } from "vitest";
import { ProviderError, Settings } from "../../src/lib/types";
import { fetchCursorUsage, parseCursorUsageSummary } from "../../src/lib/providers/cursor";
import { fakeDeps, fakeJwt, HOME, NOW } from "../fake-deps";

const DB_PATH = `${HOME}/Library/Application Support/Cursor/User/globalStorage/state.vscdb`;
const USAGE_URL = "https://cursor.com/api/usage-summary";
const ME_URL = "https://cursor.com/api/auth/me";
const NOW_SECONDS = NOW / 1000;
const RESET_MS = Date.parse("2026-11-01T00:00:00Z");

const summary = {
  billingCycleStart: "2026-10-01T00:00:00.000Z",
  billingCycleEnd: "2026-11-01T00:00:00.000Z",
  membershipType: "pro",
  isUnlimited: false,
  individualUsage: {
    plan: {
      enabled: true,
      used: 1500,
      limit: 2000,
      remaining: 500,
      autoPercentUsed: 40.5,
      apiPercentUsed: 80,
      totalPercentUsed: 75,
    },
    onDemand: { enabled: true, used: 250, limit: 10000, remaining: 9750 },
    overall: { used: 1000, limit: 5000 },
  },
  teamUsage: {
    onDemand: { used: 0, limit: 50000 },
    pooled: { used: 100, limit: 1000 },
  },
};

// A Cursor access token whose `sub` and `exp` claims are the ones a real login carries.
function appToken(exp: number = NOW_SECONDS + 3600, sub = "auth0|user_01ABC"): string {
  return fakeJwt({ sub, exp });
}

function cursorRoutes(usage: unknown = summary, usageStatus = 200) {
  return [
    { prefix: USAGE_URL, respond: { status: usageStatus, body: usage } },
    { prefix: ME_URL, respond: { body: { email: "me@example.com", name: "Me", sub: "auth0|user_01ABC" } } },
  ];
}

describe("parseCursorUsageSummary", () => {
  it("reads the plan, auto and API windows, on-demand and team balances from a realistic response", () => {
    const parsed = parseCursorUsageSummary(summary);

    expect(parsed.plan).toBe("Pro");
    expect(parsed.windows).toEqual([
      { label: "Plan", usedPercent: 75, resetsAt: RESET_MS, detail: "$15.00 / $20.00" },
      { label: "Auto", usedPercent: 40.5, resetsAt: RESET_MS },
      { label: "API Models", usedPercent: 80, resetsAt: RESET_MS },
    ]);
    expect(parsed.balances).toEqual([
      { label: "On-Demand", amount: 2.5, currency: "USD", limit: 100, resetsAt: RESET_MS },
      { label: "Team On-Demand", amount: 0, currency: "USD", limit: 500, resetsAt: RESET_MS },
    ]);
  });

  it("keeps percents below 1 as they are, since the fields are already percents", () => {
    const parsed = parseCursorUsageSummary({
      individualUsage: { plan: { autoPercentUsed: 0.36, apiPercentUsed: 0.2 } },
    });
    expect(parsed.windows.map((w) => w.usedPercent)).toEqual([0.28, 0.36, 0.2]);
  });

  it("clamps percents to 0..100", () => {
    const parsed = parseCursorUsageSummary({ individualUsage: { plan: { totalPercentUsed: 150 } } });
    expect(parsed.windows[0].usedPercent).toBe(100);
  });

  it("averages auto and API when the total is missing", () => {
    const parsed = parseCursorUsageSummary({
      individualUsage: { plan: { autoPercentUsed: 40, apiPercentUsed: 60 } },
    });
    expect(parsed.windows[0]).toMatchObject({ label: "Plan", usedPercent: 50 });
  });

  it("uses whichever of auto or API exists when only one is present", () => {
    const parsed = parseCursorUsageSummary({ individualUsage: { plan: { apiPercentUsed: 30 } } });
    expect(parsed.windows).toEqual([
      { label: "Plan", usedPercent: 30, resetsAt: null },
      { label: "API Models", usedPercent: 30, resetsAt: null },
    ]);
  });

  it("falls back to plan used/limit, then the overall cap, then the pooled team cap", () => {
    const fromPlan = parseCursorUsageSummary({ individualUsage: { plan: { used: 1500, limit: 2000 } } });
    expect(fromPlan.windows[0]).toMatchObject({ usedPercent: 75, detail: "$15.00 / $20.00" });

    const fromOverall = parseCursorUsageSummary({
      individualUsage: { plan: { used: 0, limit: 0 }, overall: { used: 1000, limit: 5000 } },
    });
    expect(fromOverall.windows[0]).toMatchObject({ usedPercent: 20, detail: "$10.00 / $50.00" });

    const fromPooled = parseCursorUsageSummary({ teamUsage: { pooled: { used: 100, limit: 1000 } } });
    expect(fromPooled.windows[0]).toMatchObject({ label: "Plan", usedPercent: 10, detail: "$1.00 / $10.00" });
  });

  it("reads the cents as dollars for the balances and leaves the detail out without a limit", () => {
    const parsed = parseCursorUsageSummary({
      individualUsage: { plan: { totalPercentUsed: 10 }, onDemand: { enabled: true, used: 1234 } },
    });
    expect(parsed.windows[0].detail).toBeUndefined();
    expect(parsed.balances).toEqual([{ label: "On-Demand", amount: 12.34, currency: "USD", resetsAt: null }]);
  });

  it("shows on-demand when it is used even if disabled, and hides it when unused and disabled", () => {
    const used = parseCursorUsageSummary({
      individualUsage: { plan: { totalPercentUsed: 1 }, onDemand: { enabled: false, used: 500, limit: 1000 } },
    });
    expect(used.balances).toEqual([{ label: "On-Demand", amount: 5, currency: "USD", limit: 10, resetsAt: null }]);

    const unused = parseCursorUsageSummary({
      individualUsage: { plan: { totalPercentUsed: 1 }, onDemand: { enabled: false, used: 0, limit: 1000 } },
    });
    expect(unused.balances).toEqual([]);
  });

  it("leaves the cap out of the on-demand balance when the cap is zero", () => {
    const parsed = parseCursorUsageSummary({
      individualUsage: { plan: { totalPercentUsed: 1 }, onDemand: { enabled: true, used: 500, limit: 0 } },
    });
    expect(parsed.balances).toEqual([{ label: "On-Demand", amount: 5, currency: "USD", resetsAt: null }]);
  });

  it("hides the team balance when it has no limit", () => {
    const parsed = parseCursorUsageSummary({
      individualUsage: { plan: { totalPercentUsed: 1 } },
      teamUsage: { onDemand: { used: 300, limit: 0 } },
    });
    expect(parsed.balances).toEqual([]);
  });

  it("accepts numeric strings", () => {
    const parsed = parseCursorUsageSummary({ individualUsage: { plan: { totalPercentUsed: "42.5" } } });
    expect(parsed.windows[0].usedPercent).toBe(42.5);
  });

  it("maps membership types to plan names", () => {
    const plans: Record<string, string> = {
      pro: "Pro",
      pro_plus: "Pro Plus",
      ultra: "Ultra",
      free: "Free",
      team: "Team",
      enterprise: "Enterprise",
    };
    for (const [membership, name] of Object.entries(plans)) {
      expect(
        parseCursorUsageSummary({ membershipType: membership, individualUsage: { plan: { totalPercentUsed: 1 } } })
          .plan,
      ).toBe(name);
    }
  });

  it("leaves resetsAt null when the billing cycle end is missing", () => {
    const parsed = parseCursorUsageSummary({ individualUsage: { plan: { totalPercentUsed: 5 } } });
    expect(parsed.windows[0].resetsAt).toBeNull();
  });

  it("throws a parse error when nothing usable came back", () => {
    for (const json of [{}, [], null, "nope", { individualUsage: { plan: {} }, teamUsage: {} }]) {
      expect(() => parseCursorUsageSummary(json)).toThrow(expect.any(ProviderError));
      expect(() => parseCursorUsageSummary(json)).toThrowError(/no usable limits/);
    }
  });
});

describe("fetchCursorUsage credential sources", () => {
  const bareCookie: Settings = { cursorCookie: "abc123" };

  it("sends a bare cookie value from preferences as the session cookie", async () => {
    const deps = fakeDeps({ routes: cursorRoutes() });
    const usage = await fetchCursorUsage(deps, bareCookie);

    expect(usage).toMatchObject({
      provider: "cursor",
      plan: "Pro",
      account: "me@example.com",
      source: "Cursor session cookie",
      fetchedAt: NOW,
      notes: [],
    });
    expect(deps.requests[0]).toMatchObject({ url: USAGE_URL, method: "GET" });
    expect(deps.requests[0].headers.cookie).toBe("WorkosCursorSessionToken=abc123");
    expect(deps.requests[1].url).toBe(ME_URL);
    expect(deps.requests[1].headers.cookie).toBe("WorkosCursorSessionToken=abc123");
  });

  it("extracts the value from a WorkosCursorSessionToken=<value> pair", async () => {
    const deps = fakeDeps({ routes: cursorRoutes() });
    await fetchCursorUsage(deps, { cursorCookie: "  WorkosCursorSessionToken=abc123  " });
    expect(deps.requests[0].headers.cookie).toBe("WorkosCursorSessionToken=abc123");
  });

  it("extracts the value from a whole Cookie header", async () => {
    const deps = fakeDeps({ routes: cursorRoutes() });
    await fetchCursorUsage(deps, { cursorCookie: "sessionid=1; WorkosCursorSessionToken=user_01%3A%3Aabc; other=2" });
    expect(deps.requests[0].headers.cookie).toBe("WorkosCursorSessionToken=user_01%3A%3Aabc");
  });

  it("prefers the manual cookie over the app's login and never opens the database", async () => {
    const deps = fakeDeps({ routes: cursorRoutes() });
    deps.sqliteResults.set(DB_PATH, appToken());
    await fetchCursorUsage(deps, bareCookie);

    expect(deps.sqliteCalls).toEqual([]);
    expect(deps.requests[0].headers.cookie).toBe("WorkosCursorSessionToken=abc123");
  });

  it("builds the cookie from the Cursor app's access token when no manual cookie is set", async () => {
    const deps = fakeDeps({ routes: cursorRoutes() });
    const token = appToken();
    deps.sqliteResults.set(DB_PATH, `${token}\n`);

    const usage = await fetchCursorUsage(deps, {});

    expect(usage.source).toBe("Cursor app");
    expect(deps.sqliteCalls).toEqual([
      {
        dbPath: DB_PATH,
        sql: "SELECT value FROM ItemTable WHERE key = 'cursorAuth/accessToken' LIMIT 1;",
      },
    ]);
    expect(deps.requests[0].headers.cookie).toBe(`WorkosCursorSessionToken=user_01ABC%3A%3A${token}`);
  });

  it("treats a blank manual cookie as absent", async () => {
    const deps = fakeDeps({ routes: cursorRoutes() });
    deps.sqliteResults.set(DB_PATH, appToken());
    const usage = await fetchCursorUsage(deps, { cursorCookie: "   " });
    expect(usage.source).toBe("Cursor app");
  });

  it("uses the whole subject when it has no pipe", async () => {
    const deps = fakeDeps({ routes: cursorRoutes() });
    deps.sqliteResults.set(DB_PATH, appToken(NOW_SECONDS + 3600, "user_09XYZ"));
    await fetchCursorUsage(deps, {});
    expect(deps.requests[0].headers.cookie).toMatch(/^WorkosCursorSessionToken=user_09XYZ%3A%3A/);
  });

  it("reports not-connected when the database is missing", async () => {
    const deps = fakeDeps({ routes: cursorRoutes() });
    const error = await fetchCursorUsage(deps, {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ kind: "not-connected", message: "Cursor isn't signed in on this Mac" });
    expect((error as ProviderError).hint).toContain("Cursor Session Cookie");
    expect(deps.requests).toEqual([]);
  });

  it("reports not-connected when the database has no token", async () => {
    const deps = fakeDeps({ routes: cursorRoutes() });
    deps.sqliteResults.set(DB_PATH, "  \n");
    await expect(fetchCursorUsage(deps, {})).rejects.toMatchObject({ kind: "not-connected" });
    expect(deps.requests).toEqual([]);
  });

  it("reports an auth error with the open-Cursor hint when the app token expires within a minute", async () => {
    const deps = fakeDeps({ routes: cursorRoutes() });
    deps.sqliteResults.set(DB_PATH, appToken(NOW_SECONDS + 30));

    const error = await fetchCursorUsage(deps, {}).catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: "auth", hint: "Open Cursor to refresh its login" });
    expect(deps.requests).toEqual([]);
  });

  it("reports an auth error when the app token is already expired or has no exp claim", async () => {
    const expired = fakeDeps({ routes: cursorRoutes() });
    expired.sqliteResults.set(DB_PATH, appToken(NOW_SECONDS - 1));
    await expect(fetchCursorUsage(expired, {})).rejects.toMatchObject({ kind: "auth" });

    const noExp = fakeDeps({ routes: cursorRoutes() });
    noExp.sqliteResults.set(DB_PATH, fakeJwt({ sub: "auth0|user_01ABC" }));
    await expect(fetchCursorUsage(noExp, {})).rejects.toMatchObject({ kind: "auth" });
  });

  it("reports an auth error when the app token is not a readable JWT", async () => {
    const deps = fakeDeps({ routes: cursorRoutes() });
    deps.sqliteResults.set(DB_PATH, "not-a-jwt");
    await expect(fetchCursorUsage(deps, {})).rejects.toMatchObject({ kind: "auth" });
    expect(deps.requests).toEqual([]);
  });
});

describe("fetchCursorUsage requests", () => {
  it("returns auth with the cookie hint when the manual cookie is rejected", async () => {
    const deps = fakeDeps({ routes: cursorRoutes(summary, 401) });
    const error = await fetchCursorUsage(deps, { cursorCookie: "stale" }).catch((e: unknown) => e);

    expect(error).toMatchObject({ kind: "auth" });
    expect((error as ProviderError).hint).toContain("Cursor Session Cookie");
    // The fallback action is named first, and the preference second.
    expect((error as ProviderError).hint).toMatch(/^Choose Use Cursor Session Cookie from this item's actions/);
    expect((error as ProviderError).message).not.toContain("stale");
  });

  it("names the Cursor Session Cookie preference in the hint when the cookie came from there", async () => {
    const deps = fakeDeps({ routes: cursorRoutes(summary, 401) });
    const error = await fetchCursorUsage(deps, { cursorCookie: "stale", cursorCookieSource: "preference" }).catch(
      (e: unknown) => e,
    );

    expect(error).toMatchObject({
      kind: "auth",
      hint: 'Paste a fresh WorkosCursorSessionToken cookie from cursor.com into the "Cursor Session Cookie" preference',
    });
  });

  it("returns auth with the open-Cursor hint when the app's login is rejected", async () => {
    const deps = fakeDeps({ routes: cursorRoutes(summary, 403) });
    deps.sqliteResults.set(DB_PATH, appToken());
    await expect(fetchCursorUsage(deps, {})).rejects.toMatchObject({
      kind: "auth",
      hint: "Open Cursor to refresh its login",
    });
  });

  it("reports a parse error for a non-JSON usage response", async () => {
    const deps = fakeDeps({ routes: [{ prefix: USAGE_URL, respond: { body: "<html>login</html>" } }] });
    await expect(fetchCursorUsage(deps, { cursorCookie: "abc" })).rejects.toMatchObject({ kind: "parse" });
  });

  it("reports a parse error when the usage response has no usable numbers", async () => {
    const deps = fakeDeps({ routes: cursorRoutes({ membershipType: "pro" }) });
    await expect(fetchCursorUsage(deps, { cursorCookie: "abc" })).rejects.toMatchObject({ kind: "parse" });
  });

  it("reports an http error when the usage endpoint fails", async () => {
    const deps = fakeDeps({ routes: cursorRoutes(summary, 500) });
    await expect(fetchCursorUsage(deps, { cursorCookie: "abc" })).rejects.toMatchObject({ kind: "http" });
  });

  it("still returns usage when the account lookup fails", async () => {
    const deps = fakeDeps({
      routes: [
        { prefix: USAGE_URL, respond: { body: summary } },
        { prefix: ME_URL, respond: { status: 500, body: { error: "boom" } } },
      ],
    });
    const usage = await fetchCursorUsage(deps, { cursorCookie: "abc" });
    expect(usage.account).toBeUndefined();
    expect(usage.windows.length).toBeGreaterThan(0);
  });

  it("uses the name as the account when there is no email", async () => {
    const deps = fakeDeps({
      routes: [
        { prefix: USAGE_URL, respond: { body: summary } },
        { prefix: ME_URL, respond: { body: { name: "Omar", sub: "auth0|user_01ABC" } } },
      ],
    });
    const usage = await fetchCursorUsage(deps, { cursorCookie: "abc" });
    expect(usage.account).toBe("Omar");
  });
});
