import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(
  readFileSync(new URL("../src/earnings.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

const now = Date.parse("2026-10-22T12:00:00Z");
const day = 86_400_000;
const config = {
  source: "account",
  id: "123",
  credential: "test-cookie",
  period: "30",
};
const completed = (value) => ({
  done: true,
  response: { values: [{ dataPoints: [{ value }] }] },
});
const transaction = (id, amount, created = now - 1000, extra = {}) => ({
  idHash: String(id),
  created: new Date(created).toISOString(),
  currency: { type: "Robux", amount },
  ...extra,
});
const page = (data = [], nextPageCursor = null) => ({ data, nextPageCursor });

function harness(
  respond = () => {
    throw new Error("Unexpected request");
  },
) {
  const requests = [];
  const waits = [];
  const exports = {};
  runInNewContext(source, {
    exports,
    URL,
    URLSearchParams,
    AbortSignal,
    require(name) {
      if (name === "node:crypto") return { createHash };
      if (name === "node:timers/promises")
        return {
          setTimeout: async (ms) => {
            waits.push(ms);
          },
        };
      throw new Error(`Unexpected module ${name}`);
    },
    fetch: async (url, options) => {
      requests.push({ url, options });
      const result = await respond(new URL(url), options, requests.length);
      return result instanceof Response ? result : Response.json(result);
    },
  });
  return { ...exports, requests, waits };
}

test("each source requires only its own ID and credential; cookies cannot inject headers", () => {
  const api = harness();
  const base = { earningsPeriod: "30" };
  const game = api.earningsConfig({
    ...base,
    earningsSource: "game",
    universeId: " 456 ",
    apiKey: "key",
  });
  assert.equal(game.id, "456");
  const account = api.earningsConfig({
    ...base,
    earningsSource: "account",
    earningsUserId: "123",
    robloxSecurityCookie: ".ROBLOSECURITY=test-cookie",
  });
  assert.equal(account.credential, "test-cookie");
  assert.throws(
    () => api.earningsConfig({ ...base, earningsSource: "group" }),
    /Earnings Source/,
  );
  assert.throws(
    () => api.earningsConfig({ ...base, earningsSource: "account" }),
    /Roblox User ID/,
  );
  assert.throws(
    () =>
      api.earningsConfig({
        ...base,
        earningsSource: "account",
        earningsUserId: "../123",
      }),
    /positive number/,
  );
  assert.throws(
    () =>
      api.earningsConfig({
        ...base,
        earningsSource: "game",
        universeId: "123",
      }),
    /API Key/,
  );
  assert.throws(
    () =>
      api.earningsConfig({
        ...base,
        earningsSource: "account",
        earningsUserId: "123",
        robloxSecurityCookie: "cookie; other=value",
      }),
    /credential value/,
  );
  assert.throws(
    () =>
      api.earningsConfig({
        ...base,
        earningsSource: "account",
        earningsUserId: "123",
        robloxSecurityCookie: "cookie\r\nheader: value",
      }),
    /credential value/,
  );
  assert.throws(
    () =>
      api.earningsConfig({
        ...base,
        earningsSource: "game",
        earningsPeriod: "bogus",
      }),
    /Time Range/,
  );
});

test("all ranges use elapsed days across DST and month boundaries; all-time is not a year", () => {
  const api = harness();
  const boundary = Date.parse("2026-11-01T12:00:00Z");
  for (const days of [1, 7, 30, 90, 180]) {
    const result = api.earningsWindow(String(days), boundary);
    assert.equal(result.end - result.start, days * day);
  }
  assert.equal(api.earningsWindow("all", now).start, 0);
  assert.equal(
    new Date(api.earningsWindow("all", now, true).start).toISOString(),
    "2022-10-22T12:00:00.000Z",
  );
});

test("Robux and standard DevEx USD formats distinguish zero and use cents", () => {
  const api = harness();
  assert.equal(api.formatEarnings(30000, "robux"), "30,000");
  assert.equal(api.formatEarnings(30000, "usd"), "≈$114.00");
  assert.equal(api.formatEarnings(0, "robux"), "0");
  assert.equal(api.formatEarnings(0, "usd"), "≈$0.00");
  assert.equal(api.formatEarnings(1000000, "usd"), "≈$3,800.00");
});

test("cache keys isolate sources, IDs, ranges, and credentials without storing the secret", () => {
  const api = harness();
  const key = api.earningsCacheKey(config);
  assert.match(key, /^[a-f0-9]{64}$/);
  for (const change of [
    { source: "game" },
    { id: "456" },
    { period: "all" },
    { credential: "new-cookie" },
  ]) {
    assert.notEqual(api.earningsCacheKey({ ...config, ...change }), key);
  }
});

test("game queries use net revenue and an API key, including completed asynchronous operations", async () => {
  const api = harness((url, options, count) => {
    assert.equal(options.headers["x-api-key"], "test-key");
    assert.equal(options.headers.Cookie, undefined);
    assert.equal(options.redirect, "error");
    if (count === 1) {
      assert.equal(
        url.pathname,
        "/analytics-query-api/v1/universes/123/metrics",
      );
      assert.deepEqual(JSON.parse(options.body), {
        metric: "DailyRevenue",
        granularity: "None",
        startTime: "2026-09-22T12:00:00.000Z",
        endTime: "2026-10-22T12:00:00.000Z",
      });
      return {
        done: false,
        path: "v1/universes/123/operations/metrics/abc-123",
      };
    }
    assert.equal(options.method, "GET");
    return completed(700);
  });
  assert.equal(
    await api.fetchGameEarnings(
      { ...config, source: "game", credential: "test-key" },
      now,
    ),
    700,
  );
  assert.equal(api.requests.length, 2);
  assert.deepEqual(api.waits, [1000]);
});

test("the final allowed game poll is consumed, and pending operations are bounded", async () => {
  const pending = {
    done: false,
    path: "v1/universes/123/operations/metrics/abc",
  };
  const api = harness((url, options, count) =>
    count === 9 ? completed(0) : pending,
  );
  assert.equal(
    await api.fetchGameEarnings({ ...config, source: "game" }, now),
    0,
  );
  const slow = harness(() => pending);
  await assert.rejects(
    slow.fetchGameEarnings({ ...config, source: "game" }, now),
    /still preparing/,
  );
  assert.equal(slow.requests.length, 9);
});

test("game poll paths cannot send keys to another host or universe", async () => {
  for (const path of [
    "https://example.com/key",
    "v1/universes/999/operations/metrics/abc",
    "v1/universes/123/operations/metrics/../../abc",
  ]) {
    const api = harness(() => ({ done: false, path }));
    await assert.rejects(
      api.fetchGameEarnings({ ...config, source: "game" }, now),
      /invalid analytics operation/,
    );
    assert.equal(api.requests.length, 1);
  }
});

test("missing and malformed game data are errors, not zero earnings", async () => {
  for (const response of [
    { done: true, response: { values: [] } },
    completed("100"),
    { done: true, error: { code: 2001 } },
  ]) {
    const api = harness(() => response);
    await assert.rejects(
      api.fetchGameEarnings({ ...config, source: "game" }, now),
    );
  }
});

test("account earnings follow all pages, exclude non-income types and stop at the requested date", async () => {
  const api = harness((url, options) => {
    assert.equal(options.headers.Cookie, ".ROBLOSECURITY=test-cookie");
    assert.equal(options.headers["x-api-key"], undefined);
    assert.equal(options.redirect, "error");
    if (url.pathname.endsWith("transaction-types"))
      return {
        HasSale: true,
        HasGroupPayout: true,
        HasPurchase: true,
        HasCurrencyPurchase: true,
        HasPremiumStipend: true,
      };
    const type = url.searchParams.get("transactionType");
    assert.equal(url.searchParams.get("sortOrder"), "Desc");
    assert.equal(url.searchParams.get("limit"), "100");
    if (type === "GroupPayout") return page([transaction("payout", 50)]);
    assert.equal(type, "Sale");
    if (!url.searchParams.has("cursor"))
      return page(
        [
          transaction("new", 500, now + 1000),
          transaction("a", 70, now - 1000, { isPending: true }),
        ],
        "next+/=",
      );
    assert.equal(url.searchParams.get("cursor"), "next+/=");
    return page(
      [
        transaction("a", 70),
        transaction("b", 30, now - 30 * day),
        transaction("old", 900, now - 30 * day - 1),
      ],
      "must-not-follow",
    );
  });
  const state = {};
  await api.syncTransactionEarnings(config, state, () => {}, now);
  assert.equal(state.snapshot.total, 150);
  assert.equal(state.snapshot.asOf, now);
  assert.equal(state.scan, undefined);
  assert.equal(api.requests.length, 4);
});

test("large all-time histories resume across runs and keep the prior complete total until finished", async () => {
  const api = harness((url) => {
    if (url.pathname.endsWith("transaction-types")) return { HasSale: true };
    const cursor = Number(url.searchParams.get("cursor") ?? 0);
    return page(
      [
        transaction(
          cursor,
          10,
          Date.parse("2015-01-01T00:00:00Z") - cursor * 1000,
        ),
      ],
      cursor < 10 ? String(cursor + 1) : null,
    );
  });
  let state = { snapshot: { total: 9, asOf: now - day } };
  let persisted;
  const save = () => {
    persisted = JSON.stringify(state);
  };
  await api.syncTransactionEarnings(
    { ...config, period: "all" },
    state,
    save,
    now,
  );
  assert.equal(api.requests.length, 8);
  assert.equal(state.scan.pages, 7);
  assert.equal(state.snapshot.total, 9);
  assert.equal(persisted.includes("test-cookie"), false);
  state = JSON.parse(persisted);
  await api.syncTransactionEarnings(
    { ...config, period: "all" },
    state,
    save,
    now + 60000,
  );
  assert.equal(state.snapshot.total, 110);
  assert.equal(state.snapshot.asOf, now); // The original scan window stays fixed.
  assert.equal(state.scan, undefined);
});

test("a failed page preserves progress and a retry cannot count it twice", async () => {
  let fail = true;
  const api = harness((url) => {
    if (url.pathname.endsWith("transaction-types")) return { HasSale: true };
    if (!url.searchParams.has("cursor"))
      return page([transaction("a", 10)], "next");
    if (fail) return new Response("private server details", { status: 500 });
    return page([transaction("a", 10), transaction("b", 20)]);
  });
  const state = {};
  await assert.rejects(
    api.syncTransactionEarnings(config, state, () => {}, now),
    /Roblox 500/,
  );
  assert.equal(state.snapshot, undefined);
  assert.equal(state.scan.cursor, "next");
  assert.equal(state.scan.total, 10);
  fail = false;
  await api.syncTransactionEarnings(config, state, () => {}, now + 60000);
  assert.equal(state.snapshot.total, 30);
});

test("malformed pages and stalled cursors never publish partial totals", async () => {
  for (const badPage of [
    page([transaction("bad", "100")]),
    page([
      transaction("bad", 10, now - 1000, {
        currency: { type: "Unknown", amount: 10 },
      }),
    ]),
    page([transaction("bad", 10, now - 1000, { created: "bad-date" })]),
    { data: [], nextPageCursor: 123 },
    page([], "stalled"),
  ]) {
    const api = harness((url) =>
      url.pathname.endsWith("transaction-types") ? { HasSale: true } : badPage,
    );
    const state = {};
    await assert.rejects(
      api.syncTransactionEarnings(config, state, () => {}, now),
    );
    assert.equal(state.snapshot, undefined);
    assert.equal(state.scan.total, 0);
  }
});

test("empty income history is zero; malformed category flags are not", async () => {
  const empty = harness(() => ({ HasSale: false, HasPurchase: true }));
  const state = {};
  await empty.syncTransactionEarnings(config, state, () => {}, now);
  assert.equal(state.snapshot.total, 0);
  const malformed = harness(() => ({ HasSale: "true" }));
  await assert.rejects(
    malformed.syncTransactionEarnings(config, {}, () => {}, now),
    /invalid transaction categories/,
  );
});

test("authentication errors are actionable and rate limits honor Retry-After", async () => {
  for (const [status, pattern] of [
    [401, /session has expired/],
    [403, /same account/],
  ]) {
    const api = harness(
      () => new Response("secret server message", { status }),
    );
    await assert.rejects(
      api.syncTransactionEarnings(config, {}, () => {}, now),
      pattern,
    );
  }
  const before = Date.now();
  const api = harness(
    () => new Response("", { status: 429, headers: { "Retry-After": "180" } }),
  );
  await assert.rejects(
    api.syncTransactionEarnings(config, {}, () => {}, now),
    (error) => {
      assert.ok(error instanceof api.EarningsRequestError);
      assert.ok(error.retryAt >= before + 180000);
      assert.match(error.message, /rate limit/);
      return true;
    },
  );
});
