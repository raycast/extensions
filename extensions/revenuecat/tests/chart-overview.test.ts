import { test } from "node:test";
import assert from "node:assert/strict";
import { chartTotal, overviewDateRange } from "../src/lib/chart-overview";

test("overview date range includes today in UTC across month, year and leap-day boundaries", () => {
  assert.deepEqual(overviewDateRange(new Date("2026-10-11T23:59:59Z")), { start: "2026-09-13", end: "2026-10-11" });
  assert.deepEqual(overviewDateRange(new Date("2026-01-01T00:00:00Z")), { start: "2025-12-04", end: "2026-01-01" });
  assert.deepEqual(overviewDateRange(new Date("2024-03-01T00:00:00Z")), { start: "2024-02-02", end: "2024-03-01" });
});

test("chart totals accept zero and reject missing, nonnumeric, segmented or wrong-currency data", () => {
  const data = {
    object: "chart_data",
    yaxis_currency: "USD",
    segments: null,
    measures: [{ display_name: "Revenue", unit: "$" }],
    summary: { total: { Revenue: 0 } },
  };
  assert.equal(chartTotal(data, "Revenue", "$", "USD"), 0);
  for (const value of [
    null,
    {},
    { ...data, summary: {} },
    { ...data, summary: { total: { Revenue: "0" } } },
    { ...data, segments: [{}] },
    { ...data, yaxis_currency: "EUR" },
  ]) {
    assert.throws(() => chartTotal(value, "Revenue", "$", "USD"), /valid Revenue total/);
  }
});

test("active customer counts use one distinct period and never sum repeated customers", async () => {
  const { chartActiveCustomers } = await import("../src/lib/chart-overview");
  const data = {
    object: "chart_data",
    resolution: "year",
    segments: null,
    measures: [{ display_name: "Active Customers", unit: "#" }],
    values: [{ measure: 0, value: 664, incomplete: true }],
  };
  assert.equal(chartActiveCustomers(data), 664);
  assert.equal(chartActiveCustomers({ ...data, values: [{ measure: 0, value: 0 }] }), 0);
  for (const invalid of [
    null,
    { ...data, resolution: "day" },
    { ...data, values: [] },
    {
      ...data,
      values: [
        { measure: 0, value: 20 },
        { measure: 0, value: 30 },
      ],
    },
  ]) {
    assert.throws(() => chartActiveCustomers(invalid), /single distinct/);
  }
});
