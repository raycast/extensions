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
test("rounds currency metrics to whole amounts", () => {
  const metric = (value: number) => formatMetric({ ...demoOverview.metrics[0], value }, "USD");
  const whole = (value: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  assert.equal(metric(669.92), whole(670));
  assert.equal(metric(0.49), whole(0));
});
test("stops repeated pagination", async () => {
  const client = new RevenueCatClient("test", (async () =>
    json({ items: [], next_page: "/projects?limit=100" })) as typeof fetch);
  await assert.rejects(client.projects(), /repeated pagination/);
});

test("v3 replaces all metrics with verified totals and current daily values; legacy makes only the overview request", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-11T20:00:00Z") });
  const urls: URL[] = [];
  const client = new RevenueCatClient("test", (async (input) => {
    const url = new URL(String(input));
    urls.push(url);
    if (url.pathname.endsWith("/overview")) return json(demoOverview);
    assert.equal(url.searchParams.get("realtime"), "true");
    const currentChart = v3Charts.find((chart) => chart.current && url.pathname.endsWith(`/${chart.chart}`));
    assert.equal(url.searchParams.get("start_date"), currentChart ? "2026-10-10" : "2026-09-13");
    assert.equal(url.searchParams.get("end_date"), "2026-10-11");
    assert.equal(url.searchParams.get("expand_periods"), "false");
    if (currentChart) {
      assert.equal(url.searchParams.get("resolution"), "0");
      assert.equal(url.searchParams.has("aggregate"), false);
      return json(validV3Chart(currentChart));
    }
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
  assert.equal(urls.length, 7);
  assert.equal(data.metrics.find((m) => m.id === "revenue")?.value, 2072.78);
  assert.equal(data.metrics.find((m) => m.id === "new_customers")?.value, 525);
  assert.equal(data.metrics.find((m) => m.id === "active_users")?.value, 664);
  assert.equal(data.metrics.find((m) => m.id === "active_users")?.name, "Active Customers");
  for (const chart of v3Charts.filter((chart) => chart.current)) {
    const metric = data.metrics.find((m) => m.id === chart.id)!;
    assert.equal(metric.value, chart.value);
    assert.equal(metric.period, "P0D");
    assert.equal(metric.last_updated_at, null);
  }
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
    return json(validV3Chart(v3Charts.find((chart) => url.includes(`/${chart.chart}?`))!));
  }) as typeof fetch);
  const metric = (await client.overview("project", "USD", undefined, true)).metrics.find(
    (m) => m.id === "active_users",
  )!;
  assert.equal(metric.value, null);
  assert.match(metric.unavailableReason!, /calendar years/);
  assert.equal(formatMetric(metric, "USD"), "Unavailable");
});

const v3Charts = [
  { chart: "revenue", id: "revenue", name: "Revenue", unit: "$", value: 12 },
  { chart: "customers_new", id: "new_customers", name: "New Customers", unit: "#", value: 0 },
  { chart: "customers_active", id: "active_users", name: "Active Customers", unit: "#", value: 7 },
  { chart: "mrr", id: "mrr", name: "MRR", unit: "$", value: 669.92, current: true },
  { chart: "actives", id: "active_subscriptions", name: "Actives", unit: "#", value: 128, current: true },
  { chart: "trials", id: "active_trials", name: "Active Trials", unit: "#", value: 82, current: true },
];
function validV3Chart(chart: (typeof v3Charts)[number]) {
  return {
    object: "chart_data",
    resolution: chart.current ? "day" : "year",
    segments: null,
    yaxis_currency: "USD",
    measures: [{ display_name: chart.name, unit: chart.unit }],
    summary: { total: { [chart.name]: chart.value } },
    values: [
      {
        measure: 0,
        value: chart.value,
        cohort: Date.parse(new Date().toISOString().slice(0, 10)) / 1000,
        incomplete: true,
      },
    ],
  };
}

test("a chart HTTP or parse failure only marks that metric unavailable and preserves all successful metrics", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-11T20:00:00Z") });
  for (const failed of v3Charts) {
    for (const failure of ["http", "parse"]) {
      const client = new RevenueCatClient("test", (async (input) => {
        const path = new URL(String(input)).pathname;
        if (path.endsWith("/overview")) return json(demoOverview);
        const chart = v3Charts.find((item) => path.endsWith(`/${item.chart}`))!;
        return chart.id === failed.id
          ? failure === "http"
            ? json({ message: "private provider message" }, 403)
            : json({ object: "chart_data" })
          : json(validV3Chart(chart));
      }) as typeof fetch);
      const result = await client.overview("project", "USD", undefined, true);
      for (const metric of result.metrics) {
        const chart = v3Charts.find((item) => item.id === metric.id);
        if (!chart) {
          assert.deepEqual(
            metric,
            demoOverview.metrics.find((item) => item.id === metric.id),
          );
        } else if (chart.id === failed.id) {
          assert.equal(metric.value, null);
          assert.match(metric.unavailableReason!, failure === "http" ? /charts_metrics:charts:read/ : /did not return/);
          assert.ok(!metric.unavailableReason!.includes("private provider message"));
          assert.equal(formatMetric(metric, "USD"), "Unavailable");
        } else {
          assert.equal(metric.value, chart.value);
          assert.equal(metric.unavailableReason, undefined);
        }
      }
    }
  }
});

test("all chart requests failing marks metrics unavailable without falling back to legacy values", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-11T20:00:00Z") });
  const client = new RevenueCatClient("test", (async (input) =>
    String(input).includes("/overview") ? json(demoOverview) : json({}, 429, { "retry-after": "30" })) as typeof fetch);
  const result = await client.overview("project", "USD", undefined, true);
  for (const metric of result.metrics) {
    if (v3Charts.some((chart) => chart.id === metric.id)) {
      assert.equal(metric.value, null);
      assert.match(metric.unavailableReason!, /30 seconds/);
    } else {
      assert.deepEqual(
        metric,
        demoOverview.metrics.find((item) => item.id === metric.id),
      );
    }
  }
});

test("cancelling a v3 load still rejects rather than returning cacheable partial metrics", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-11T20:00:00Z") });
  const controller = new AbortController();
  const client = new RevenueCatClient("test", (async (input) => {
    if (String(input).includes("/overview")) return json(demoOverview);
    controller.abort();
    throw controller.signal.reason;
  }) as typeof fetch);
  await assert.rejects(client.overview("project", "USD", controller.signal, true), { name: "AbortError" });
});
