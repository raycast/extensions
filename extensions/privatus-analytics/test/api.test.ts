import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError, Client, dashboardUrl, isValidSiteId, isValidToken, trackingSnippet } from "../src/api";

type Call = { url: string; headers: Record<string, string> };

function fakeFetch(routes: Record<string, { status?: number; body: unknown }>, calls: Call[] = []) {
  return async (url: string, init?: { headers?: Record<string, string> }) => {
    calls.push({ url, headers: init?.headers ?? {} });
    const u = new URL(url);
    const key = Object.keys(routes).find((k) => `${u.pathname}${u.search}`.startsWith(k));
    const route = key ? routes[key] : { status: 404, body: { error: { code: "not_found", message: "Not found" } } };
    const status = route.status ?? 200;
    return {
      ok: status < 300,
      status,
      text: async () => (typeof route.body === "string" ? route.body : JSON.stringify(route.body)),
    };
  };
}

test("site IDs are validated", () => {
  assert.equal(isValidSiteId("pa_ABC123"), true);
  assert.equal(isValidSiteId("pa_"), false);
  assert.equal(isValidSiteId('pa_x" onload="alert(1)'), false);
  assert.equal(isValidSiteId("ws_ABC"), false);
  assert.equal(isValidSiteId(undefined), false);
});

test("tokens must start with pat_", () => {
  assert.equal(isValidToken("pat_abc123"), true);
  assert.equal(isValidToken("  pat_abc123  "), true);
  assert.equal(isValidToken("abc123"), false);
  assert.equal(isValidToken(""), false);
});

test("tracking snippet has the site ID and refuses bad IDs", () => {
  assert.equal(
    trackingSnippet("pa_7Q2K9XH3AB"),
    '<script defer src="https://privatusstats.com/js/pa.js" data-site="pa_7Q2K9XH3AB" data-modules="engage,auto,vitals,clicks,ask"></script>',
  );
  assert.throws(() => trackingSnippet('pa_x"><script>'));
});

test("dashboard links", () => {
  assert.equal(dashboardUrl("pa_ABC"), "https://privatusanalytics.com/sites/pa_ABC/overview");
  assert.equal(dashboardUrl("../evil"), "https://privatusanalytics.com/app");
  assert.equal(dashboardUrl(), "https://privatusanalytics.com/app");
});

test("sends the bearer token and reads every page of every workspace", async () => {
  const calls: Call[] = [];
  const client = new Client(" pat_test ", {
    fetch: fakeFetch(
      {
        "/workspaces.json": {
          body: {
            data: [
              { id: "ws_ONE", name: "One" },
              { id: "ws_TWO", name: "Two" },
            ],
          },
        },
        "/workspaces/ws_ONE/sites.json?page=1": {
          body: {
            data: [{ id: "pa_A", workspace_id: "ws_ONE", domain: "a.com", name: "A", last_event_at: null }],
            meta: { total_pages: 2, stats: { pa_A: { visitors: 10, live: 2 } } },
          },
        },
        "/workspaces/ws_ONE/sites.json?page=2": {
          body: {
            data: [{ id: "pa_B", workspace_id: "ws_ONE", domain: "b.com", name: "B", last_event_at: null }],
            meta: { total_pages: 2, stats: {} },
          },
        },
        "/workspaces/ws_TWO/sites.json?page=1": {
          body: {
            data: [
              { id: "pa_C", workspace_id: "ws_TWO", domain: "c.com", name: "C", last_event_at: null },
              { id: "bad id", workspace_id: "ws_TWO", domain: "x.com", name: "X", last_event_at: null },
            ],
            meta: { total_pages: 1, stats: { pa_C: { visitors: 5 } } },
          },
        },
      },
      calls,
    ),
  });
  const sites = await client.sitesWithStats();
  assert.deepEqual(
    sites.map((s) => [s.id, s.workspaceName, s.stats.visitors ?? 0]),
    [
      ["pa_A", "One", 10],
      ["pa_B", "One", 0],
      ["pa_C", "Two", 5],
    ],
  );
  assert.equal(calls.length, 4);
  for (const c of calls) {
    assert.equal(c.headers.Authorization, "Bearer pat_test");
    assert.ok(c.url.startsWith("https://privatusanalytics.com/"));
  }
});

test("overview asks for the comparison and three panels", async () => {
  const calls: Call[] = [];
  const client = new Client("pat_test", {
    fetch: fakeFetch({ "/sites/pa_A/overview.json": { body: { data: { metrics: { visitors: 3 } } } } }, calls),
  });
  const data = await client.overview("pa_A", "7d");
  assert.equal(data.metrics.visitors, 3);
  const u = new URL(calls[0].url);
  assert.equal(u.searchParams.get("period"), "7d");
  assert.equal(u.searchParams.get("compare"), "previous_period");
  assert.deepEqual(u.searchParams.getAll("panels[]"), ["page", "referrer", "country"]);
  await assert.rejects(() => client.overview("nope", "7d"));
});

test("errors become plain messages", async () => {
  const client = new Client("pat_bad", {
    fetch: fakeFetch({ "/workspaces.json": { status: 401, body: { error: { code: "unauthorized", message: "x" } } } }),
  });
  await assert.rejects(
    () => client.workspaces(),
    (e: unknown) => e instanceof ApiError && e.status === 401 && /API token/.test(e.message),
  );
  const broken = new Client("pat_x", { fetch: fakeFetch({ "/workspaces.json": { status: 502, body: "<html>" } }) });
  await assert.rejects(() => broken.workspaces(), /trouble/);
});

// Runs against the real API only when PRIVATUS_TOKEN is set.
test("live API smoke test", { skip: !process.env.PRIVATUS_TOKEN }, async () => {
  const client = new Client(process.env.PRIVATUS_TOKEN as string);
  const sites = await client.sitesWithStats();
  assert.ok(Array.isArray(sites));
  if (sites[0]) {
    const o = await client.overview(sites[0].id, "7d");
    assert.equal(typeof o.metrics, "object");
  }
});
