import { test } from "node:test";
import assert from "node:assert/strict";
import {
  revenueDayPage,
  revenueRange,
  parseRevenueChart,
  shiftDate,
  type DateRange,
  boundedRevenueRange,
  calendarDate,
  utcTodayForDatePicker,
} from "../src/lib/revenue-history";
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
  const range = boundedRevenueRange(revenueRange("all", "2026-10-07"), Date.parse("2020-01-01"));
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
  const range = boundedRevenueRange(revenueRange("7d", "2026-10-07"));
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

test("all history stops at project creation, including a partial final page and zero-revenue years", async () => {
  const range = boundedRevenueRange(revenueRange("all", "2026-10-07"), Date.parse("2025-10-01T23:00:00Z"));
  const signal = new AbortController().signal;
  const first = await revenueDayPage(range, undefined, async (r) => days(r), signal);
  const last = await revenueDayPage(range, first.next_page!, async (r) => days(r), signal);
  assert.equal(last.items.at(-1)?.id, "2025-10-01");
  assert.equal(last.next_page, null);
  assert.equal(first.items.length + last.items.length, 372);
  let called = false;
  const beyond = await revenueDayPage(
    range,
    "2025-09-30",
    async () => {
      called = true;
      return [];
    },
    signal,
  );
  assert.deepEqual(beyond, { items: [], next_page: null });
  assert.equal(called, false);
  assert.throws(() => boundedRevenueRange({ end: "2026-10-07" }), /creation date/);
  assert.throws(() => boundedRevenueRange({ end: "2026-10-07" }, NaN), /creation date/);
});
test("demo revenue history is finite and explicit ranges can include imported history before project creation", async () => {
  const { demoProject } = await import("../src/lib/demo");
  const end = new Date(demoProject.created_at! + 730 * 86400000).toISOString().slice(0, 10);
  const range = boundedRevenueRange(revenueRange("all", end), demoProject.created_at);
  let next: string | undefined;
  let count = 0;
  let pages = 0;
  do {
    const page = await revenueDayPage(range, next, async (r) => days(r), new AbortController().signal);
    next = page.next_page || undefined;
    count += page.items.length;
    assert.ok(++pages <= 3);
  } while (next);
  assert.equal(count, 731);
  assert.deepEqual(boundedRevenueRange({ start: "2020-01-01", end }, demoProject.created_at), {
    start: "2020-01-01",
    end,
  });
});
test("date picker defaults to the current UTC day in timezones ahead of and behind UTC", () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ["Pacific/Auckland", "America/Los_Angeles", "UTC"]) {
      process.env.TZ = zone;
      for (const timestamp of ["2026-10-07T00:30:00Z", "2026-10-07T23:30:00Z"]) {
        const now = new Date(timestamp);
        const selected = utcTodayForDatePicker(now);
        assert.equal(calendarDate(selected), "2026-10-07");
      }
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
