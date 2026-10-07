import { test } from "node:test";
import assert from "node:assert/strict";
import { revenueDayPage, revenueRange, parseRevenueChart, shiftDate, type DateRange } from "../src/lib/revenue-history";
import { ExplorerClient } from "../src/lib/explorer-api";

function days(range: Required<DateRange>) {
  const result = [];
  for (let id = range.start; id <= range.end; id = shiftDate(id, 1)) result.push({ id, value: 0 });
  return result;
}
function chart() {
  return {
    object: "chart_data",
    resolution: "day",
    yaxis_currency: "USD",
    segments: null,
    user_selectors: { revenue_type: "revenue" },
    measures: [
      { display_name: "Transactions", unit: "#" },
      { display_name: "Revenue", unit: "$" },
    ],
    values: [
      { cohort: Date.parse("2026-10-06") / 1000, measure: 0, value: 8 },
      { cohort: Date.parse("2026-10-06") / 1000, measure: 1, value: 42.99 },
      { cohort: Date.parse("2026-10-07") / 1000, measure: 1, value: 0 },
    ],
  };
}
test("loads a year in one request and paginates backwards without gaps, including zeros", async () => {
  const calls: Required<DateRange>[] = [];
  const read = async (range: Required<DateRange>) => {
    calls.push(range);
    return days(range);
  };
  const range = revenueRange("all", "2026-10-07");
  const signal = new AbortController().signal;
  const first = await revenueDayPage(range, undefined, read, signal);
  const second = await revenueDayPage(range, first.next_page!, read, signal);
  assert.equal(calls.length, 2);
  assert.equal(first.items.length, 365);
  assert.equal(second.items.length, 365);
  assert.equal(first.items[0].id, "2026-10-07");
  assert.equal(second.items[0].id, shiftDate(first.items.at(-1)!.id, -1));
  assert.equal(new Set([...first.items, ...second.items].map((d) => d.id)).size, 730);
  assert.equal(first.items[0].value, 0);
});
test("date filters respect both boundaries, including leap days", async () => {
  assert.deepEqual(revenueRange("7d", "2026-03-02"), { start: "2026-02-24", end: "2026-03-02" });
  assert.deepEqual(revenueRange("month", "2026-10-05"), { start: "2026-10-01", end: "2026-10-05" });
  const page = await revenueDayPage(
    { start: "2024-02-28", end: "2024-03-01" },
    undefined,
    async (r) => days(r),
    new AbortController().signal,
  );
  assert.deepEqual(
    page.items.map((d) => d.id),
    ["2024-03-01", "2024-02-29", "2024-02-28"],
  );
  assert.equal(page.next_page, null);
});
test("missing dates, failed requests, and cancelled batches cannot silently skip history", async () => {
  const range = revenueRange("7d", "2026-10-07");
  await assert.rejects(
    revenueDayPage(range, undefined, async () => [], new AbortController().signal),
    /incomplete/,
  );
  await assert.rejects(
    revenueDayPage(
      range,
      undefined,
      async () => {
        throw new Error("Rate limited");
      },
      new AbortController().signal,
    ),
    /Rate limited/,
  );
  const controller = new AbortController();
  await assert.rejects(
    revenueDayPage(
      range,
      undefined,
      async (r) => {
        controller.abort();
        return days(r);
      },
      controller.signal,
    ),
    { name: "AbortError" },
  );
});
test("chart parser selects revenue by measure, preserves zero, sorts newest first, and rejects ambiguous data", () => {
  assert.deepEqual(parseRevenueChart(chart(), "USD"), [
    { id: "2026-10-07", value: 0 },
    { id: "2026-10-06", value: 42.99 },
  ]);
  assert.throws(() => parseRevenueChart(chart(), "EUR"), /Unexpected/);
  assert.throws(() => parseRevenueChart({ ...chart(), resolution: "month" }, "USD"), /Unexpected/);
  assert.throws(
    () => parseRevenueChart({ ...chart(), user_selectors: { revenue_type: "proceeds" } }, "USD"),
    /Unexpected/,
  );
  const duplicate = chart();
  duplicate.values.push(duplicate.values[1]);
  assert.throws(() => parseRevenueChart(duplicate, "USD"), /duplicate/);
  const missing = chart();
  missing.values[1].value = NaN;
  assert.throws(() => parseRevenueChart(missing, "USD"), /Unexpected/);
});
test("daily revenue requests one unsegmented gross daily chart with explicit dates and currency", async () => {
  const urls: URL[] = [];
  const request = (async (url: URL) => {
    urls.push(url);
    return Response.json(chart());
  }) as typeof fetch;
  const api = new ExplorerClient("test", request);
  const result = await api.dailyRevenue("project/id", { start: "2026-10-06", end: "2026-10-07" }, "USD");
  assert.equal(urls.length, 1);
  assert.equal(urls[0].pathname, "/v2/projects/project%2Fid/charts/revenue");
  assert.equal(urls[0].searchParams.get("resolution"), "0");
  assert.equal(urls[0].searchParams.get("start_date"), "2026-10-06");
  assert.equal(urls[0].searchParams.get("end_date"), "2026-10-07");
  assert.equal(urls[0].searchParams.get("selectors"), '{"revenue_type":"revenue"}');
  assert.equal(urls[0].searchParams.has("aggregate"), false);
  assert.equal(result.length, 2);
});
