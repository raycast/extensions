const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "runway-requests-"));
let now = Date.parse("2026-09-08T12:00:00Z");
class Clock extends Date {
  static now() {
    return now;
  }
}
const entries = new Map();
class Cache {
  get(key) {
    return entries.get(key);
  }
  set(key, value) {
    entries.set(key, value);
  }
  remove(key) {
    entries.delete(key);
  }
}
let calls = 0;
let afterWait;
let beforeLock;
const urls = [];
let reply = () =>
  new Response(JSON.stringify({ ok: true, data: { items: [] } }), {
    headers: { "Content-Type": "application/json" },
  });
function load(file, mocks = {}) {
  const exported = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2021,
      },
    }).outputText,
    {
      Error,
      exports: exported,
      require: (name) => mocks[name] ?? require(name),
      Date: Clock,
      URLSearchParams,
      AbortSignal,
      fetch: async (url) => {
        urls.push(url);
        calls++;
        return reply();
      },
    },
  );
  return exported;
}
const api = load("src/api.ts");
const requests = load("src/requests.ts", {
  "@raycast/api": { Cache, environment: { supportPath: root } },
  "./api": api,
  "node:fs": {
    ...fs,
    mkdirSync: (target, options) => {
      if (target === path.join(root, "request.lock")) beforeLock?.();
      return fs.mkdirSync(target, options);
    },
  },
  "node:timers/promises": {
    setTimeout: async (ms) => {
      now += ms;
      await afterWait?.();
    },
  },
});
(async () => {
  assert.equal(requests.retryTime("120", now), now + 120_000);
  assert.equal(
    requests.retryTime("Tue, 08 Sep 2026 12:05:00 GMT", now),
    now + 300_000,
  );
  assert.equal(requests.retryTime("bad", now), now + 3_600_000);
  await requests.fetchRecords("one");
  await requests.fetchRecords("one");
  assert.equal(calls, 1, "fresh responses are shared across command calls");
  now += 121_000;
  reply = () =>
    new Response("", { status: 429, headers: { "Retry-After": "120" } });
  const stale = await requests.fetchRecords("one");
  assert.match(stale.warning, /Retry after/);
  assert.equal(stale.fetchedAt, now - 121_000);
  await assert.rejects(requests.fetchRecords("two"), /Retry after/);
  assert.equal(calls, 2, "cooldown applies to all endpoints");
  now += 120_001;
  reply = () => new Response(JSON.stringify({ ok: true, data: { items: [] } }));
  assert.equal((await requests.fetchRecords("one")).warning, undefined);
  reply = () => {
    throw new Error("Offline");
  };
  now += 121_000;
  assert.match((await requests.fetchRecords("one")).warning, /Offline/);
  assert.equal(fs.existsSync(path.join(root, "request.lock")), false);
  reply = () => new Response(JSON.stringify({ ok: true, data: { items: [] } }));
  const before = calls;
  fs.writeFileSync(
    path.join(root, "request-budget.json"),
    JSON.stringify({ requests: Array(20).fill(now - 1_000), retryAt: 0 }),
  );
  await assert.rejects(requests.fetchRecords("three"), /Retry after/);
  assert.equal(calls, before, "rolling hourly budget blocks excess requests");
  fs.writeFileSync(
    path.join(root, "request-budget.json"),
    JSON.stringify({ requests: [], retryAt: 0 }),
  );
  fs.mkdirSync(path.join(root, "request.lock"));
  const stamp = new Date(now);
  fs.utimesSync(path.join(root, "request.lock"), stamp, stamp);
  await assert.rejects(requests.fetchRecords("three"), /Timed out waiting/);
  assert.equal(
    calls,
    before,
    "concurrent commands cannot spend another request",
  );
  const sharedResult = {
    ok: true,
    data: { items: [{ id: "shared" }] },
    fetchedAt: now,
  };
  afterWait = () => {
    entries.set("shared-url", JSON.stringify(sharedResult));
    fs.rmdirSync(path.join(root, "request.lock"));
    afterWait = undefined;
  };
  const shared = await requests.fetchRecords("shared-url");
  assert.equal(
    shared.warning,
    undefined,
    "ordinary contention is not an update failure",
  );
  assert.equal(shared.data.items[0].id, "shared");
  assert.equal(calls, before, "a waiting command reuses the completed request");
  // A wedged holder outlasting the wait must not pass a stale cache off as current.
  entries.set(
    "wedged-url",
    JSON.stringify({ ...sharedResult, fetchedAt: now - 600_000 }),
  );
  fs.mkdirSync(path.join(root, "request.lock"));
  const held = new Date(now);
  fs.utimesSync(path.join(root, "request.lock"), held, held);
  const wedged = await requests.fetchRecords("wedged-url");
  assert.match(
    wedged.warning,
    /Timed out waiting/,
    "a stale cache served past the lock wait is flagged as a failed refresh",
  );
  assert.equal(wedged.data.items[0].id, "shared");
  assert.equal(calls, before, "a wedged holder does not spend a request");
  fs.rmdirSync(path.join(root, "request.lock"));

  const budgetBeforeRace = fs.readFileSync(
    path.join(root, "request-budget.json"),
    "utf8",
  );
  beforeLock = () => {
    entries.set("race-url", JSON.stringify(sharedResult));
    beforeLock = undefined;
  };
  const raced = await requests.fetchRecords("race-url");
  assert.equal(raced.data.items[0].id, "shared");
  assert.equal(
    calls,
    before,
    "a cache write before lock acquisition avoids a duplicate request",
  );
  assert.equal(
    fs.readFileSync(path.join(root, "request-budget.json"), "utf8"),
    budgetBeforeRace,
  );
  assert.equal(fs.existsSync(path.join(root, "request.lock")), false);
  fs.mkdirSync(path.join(root, "request.lock"));
  const old = new Date(now - 61_000);
  fs.utimesSync(path.join(root, "request.lock"), old, old);
  await requests.fetchRecords("three");
  reply = () =>
    new Response(JSON.stringify({ ok: true, data: { items: [] } }), {
      headers: {
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": new Date(now + 600_000).toISOString(),
      },
    });
  await requests.fetchRecords("four");
  await assert.rejects(requests.fetchRecords("five"), /Retry after/);
  fs.writeFileSync(
    path.join(root, "request-budget.json"),
    JSON.stringify({ requests: [], retryAt: 0 }),
  );
  reply = () =>
    new Response(
      JSON.stringify({
        ok: true,
        data: { items: [{ id: "history" }], hasNext: true },
      }),
    );
  const history = await requests.fetchHistory("reset_completed")({ page: 1 });
  assert.match(urls.at(-1), /kind=reset_completed&page=2/);
  assert.equal(history.data[0].result.data.items[0].id, "history");
  assert.equal(history.hasMore, true);
  now += 121_000;
  reply = () =>
    new Response("", { status: 429, headers: { "Retry-After": "30" } });
  const blockedHistory = await requests.fetchHistory("reset_completed")({
    page: 1,
  });
  assert.equal(
    blockedHistory.hasMore,
    true,
    "stale pages remain manually retryable on rate limits",
  );
  assert.match(blockedHistory.data[0].warning, /Retry after/);
  assert.equal(blockedHistory.cursor, 2);
  now += 30_001;
  let pageNumber = 0;
  reply = () =>
    new Response(
      JSON.stringify({
        ok: true,
        data: { items: [{ id: `page-${++pageNumber}` }], hasNext: true },
      }),
    );
  const fetchPage = requests.fetchHistory("reset_scheduled");
  let accumulated = [];
  let cursor;
  for (let page = 0; page < 3; page++) {
    const result = await fetchPage({ page, cursor });
    accumulated.push(...result.data);
    cursor = result.cursor;
  }
  reply = () => {
    throw new Error("Offline");
  };
  for (let page = 3; page < 5; page++) {
    const result = await fetchPage({ page, cursor });
    accumulated.push(...result.data);
    cursor = result.cursor;
    assert.equal(cursor, 4, "repeated failures keep retrying the missing page");
    assert.equal(result.hasMore, true);
    assert.match(result.data[0].warning, /Offline/);
  }
  assert.equal(
    accumulated.flatMap((entry) => entry.result?.data.items ?? []).length,
    3,
    "failed pages resolve without clearing previously accumulated records",
  );
  reply = () =>
    new Response(
      JSON.stringify({
        ok: true,
        data: { items: [{ id: "page-4" }], hasNext: false },
      }),
    );
  const recovered = await fetchPage({ page: 5, cursor });
  accumulated.push(...recovered.data);
  assert.match(urls.at(-1), /page=4&/);
  assert.equal(recovered.hasMore, false);
  assert.equal(recovered.cursor, 5);
  const visible = [
    ...new Map(accumulated.map((entry) => [entry.page, entry])).values(),
  ];
  assert.equal(visible.length, 4);
  assert.ok(visible.every((entry) => !entry.warning));
  assert.equal(visible.flatMap((entry) => entry.result.data.items).length, 4);
  const restarted = await requests.fetchHistory("all")({ page: 0, cursor: 5 });
  assert.equal(
    restarted.data[0].page,
    1,
    "refresh or kind changes restart at page one",
  );
  console.log("Request cache, cooldown, lock, and budget checks passed");
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => fs.rmSync(root, { recursive: true, force: true }));
