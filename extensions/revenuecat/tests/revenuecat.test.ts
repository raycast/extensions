import { test } from "node:test";
import assert from "node:assert/strict";
import { RevenueCatClient, demoOverview, formatMetric, periodLabel } from "../src/lib/revenuecat.ts";
const json = (body: unknown, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });
test("follows project pagination with auth and encodes project paths", async () => {
  const urls: string[] = [];
  const request = (async (url, init) => {
    urls.push(String(url));
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer test-key");
    if (urls.length === 1)
      return json({ items: [{ id: "proj1", name: "First" }], next_page: "/v2/projects?starting_after=proj1" });
    if (urls.length === 2) return json({ items: [{ id: "proj2", name: "Second" }], next_page: null });
    return json(demoOverview);
  }) as typeof fetch;
  const client = new RevenueCatClient(" test-key ", request);
  assert.equal((await client.projects()).length, 2);
  await client.overview("project/with space", "SEK");
  assert.equal(urls[2], "https://api.revenuecat.com/v2/projects/project%2Fwith%20space/metrics/overview?currency=SEK");
});
test("does not forward credentials to an external pagination URL", async () => {
  let calls = 0;
  const client = new RevenueCatClient("test", (async () => {
    calls++;
    return json({ items: [], next_page: "https://example.com/v2/projects" });
  }) as typeof fetch);
  await assert.rejects(client.projects(), /Invalid RevenueCat API URL/);
  assert.equal(calls, 1);
});
test("shows actionable errors without exposing response bodies", async () => {
  for (const [status, message] of [
    [401, /reopen the command to reconnect/],
    [403, /Permission denied/],
    [404, /Project not found/],
    [429, /in 30 seconds/],
  ] as const) {
    const client = new RevenueCatClient("test", (async () =>
      json({ message: "sensitive response" }, status, { "retry-after": "30" })) as typeof fetch);
    await assert.rejects(client.overview("proj1", "USD"), message);
  }
});
test("rejects malformed metrics and preserves zero values and periods", async () => {
  const client = new RevenueCatClient("test", (async () =>
    json({ metrics: [{ value: "oops" }], currency: "USD" })) as typeof fetch);
  await assert.rejects(client.overview("proj1", "USD"), /Unexpected/);
  assert.equal(formatMetric({ ...demoOverview.metrics[2], value: 0 }, "USD"), "0");
  assert.equal(periodLabel("P0D"), "Current");
  assert.equal(periodLabel("P28D"), "Last 28 days");
});
test("stops repeated pagination", async () => {
  const client = new RevenueCatClient("test", (async () =>
    json({ items: [], next_page: "/projects?limit=100" })) as typeof fetch);
  await assert.rejects(client.projects(), /repeated pagination/);
});

test("v3 replaces period metrics with verified chart totals; legacy makes only the overview request", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-11T20:00:00Z") });
  const urls: URL[] = [];
  const client = new RevenueCatClient("test", (async (input) => {
    const url = new URL(String(input));
    urls.push(url);
    if (url.pathname.endsWith("/overview")) return json(demoOverview);
    assert.equal(url.searchParams.get("realtime"), "true");
    assert.equal(url.searchParams.get("start_date"), "2026-09-13");
    assert.equal(url.searchParams.get("end_date"), "2026-10-11");
    assert.equal(url.searchParams.get("expand_periods"), "false");
    if (url.pathname.endsWith("/customers_active")) {
      assert.equal(url.searchParams.get("resolution"), "4");
      assert.equal(url.searchParams.has("aggregate"), false);
      return json({
        object: "chart_data",
        resolution: "year",
        segments: null,
        measures: [{ display_name: "Active Customers", unit: "#" }],
        values: [{ measure: 0, value: 664 }],
      });
    }
    const revenue = url.pathname.endsWith("/revenue");
    assert.equal(url.searchParams.get("aggregate"), "total");
    if (revenue) assert.deepEqual(JSON.parse(url.searchParams.get("selectors")!), { revenue_type: "revenue" });
    const name = revenue ? "Revenue" : "New Customers";
    return json({
      object: "chart_data",
      yaxis_currency: "USD",
      segments: null,
      measures: [{ display_name: name, unit: revenue ? "$" : "#" }],
      summary: { total: { [name]: revenue ? 2072.78 : 525 } },
    });
  }) as typeof fetch);
  const data = await client.overview("project", "USD", undefined, true);
  assert.equal(urls.length, 4);
  assert.equal(data.metrics.find((m) => m.id === "revenue")?.value, 2072.78);
  assert.equal(data.metrics.find((m) => m.id === "new_customers")?.value, 525);
  assert.equal(data.metrics.find((m) => m.id === "active_users")?.value, 664);
  assert.equal(data.metrics.find((m) => m.id === "active_users")?.name, "Active Customers");
  assert.deepEqual(
    data.metrics.find((m) => m.id === "mrr"),
    demoOverview.metrics.find((m) => m.id === "mrr"),
  );
  assert.equal(data.metrics.find((m) => m.id === "revenue")?.last_updated_at, null);
  urls.length = 0;
  assert.deepEqual(await client.overview("project", "USD", undefined, false), demoOverview);
  assert.equal(urls.length, 1);
});

test("a range crossing calendar years leaves active customers unavailable, never a duplicate count or legacy fallback", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2027-01-10T12:00:00Z") });
  const client = new RevenueCatClient("test", (async (input) => {
    const url = String(input);
    assert.ok(!url.includes("customers_active"));
    if (url.includes("/overview")) return json(demoOverview);
    const revenue = url.includes("/revenue?");
    const name = revenue ? "Revenue" : "New Customers";
    return json({
      object: "chart_data",
      yaxis_currency: "USD",
      segments: null,
      measures: [{ display_name: name, unit: revenue ? "$" : "#" }],
      summary: { total: { [name]: 0 } },
    });
  }) as typeof fetch);
  const metric = (await client.overview("project", "USD", undefined, true)).metrics.find(
    (m) => m.id === "active_users",
  )!;
  assert.equal(metric.value, null);
  assert.match(metric.unavailableReason!, /calendar years/);
  assert.equal(formatMetric(metric, "USD"), "Unavailable");
});
