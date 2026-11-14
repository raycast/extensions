import { test } from "node:test";
import assert from "node:assert/strict";
import { ExplorerClient, changeLabel, previousPeriod, revenueBuckets } from "../src/lib/explorer-api";
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
test("complete revenue periods cross month boundaries without gaps or today's partial day", () => {
  const buckets = revenueBuckets(7, 1, new Date("2026-10-02T10:00:00Z"));
  assert.deepEqual(buckets[0], { start: "2026-09-25", end: "2026-09-25" });
  assert.deepEqual(buckets[6], { start: "2026-10-01", end: "2026-10-01" });
  assert.deepEqual(previousPeriod(buckets), { start: "2026-09-18", end: "2026-09-24" });
  const weeks = revenueBuckets(8, 7, new Date("2026-03-30T00:30:00Z"));
  for (let i = 1; i < weeks.length; i++)
    assert.equal(Date.parse(weeks[i].start) - Date.parse(weeks[i - 1].end), 86400000);
  assert.equal((Date.parse(weeks[7].end) - Date.parse(weeks[0].start)) / 86400000 + 1, 56);
});
test("change labels do not invent percentage growth from zero revenue", () => {
  assert.equal(changeLabel(120, 100), "+20.0%");
  assert.equal(changeLabel(80, 100), "-20.0%");
  assert.equal(changeLabel(50, 0), "No prior revenue");
  assert.equal(changeLabel(0, 0), "No change");
});
test("search safely encodes IDs, emails, and pagination", async () => {
  const urls: string[] = [];
  const client = new ExplorerClient("test", (async (url) => {
    urls.push(String(url));
    return response({ items: [{ id: "cust" }], next_page: null });
  }) as typeof fetch);
  await client.customers("proj/1", "alex+test@example.com");
  assert.match(urls[0], /proj%2F1\/customers/);
  assert.match(urls[0], /search=alex%2Btest%40example.com/);
  await client.customers("proj/1", "", "/v2/projects/proj%2F1/customers?starting_after=cust");
  assert.match(urls[1], /starting_after=cust/);
  const before = urls.length;
  await assert.rejects(
    client.customers("proj/1", "", "https://example.com/v2/projects/proj%2F1/customers"),
    /pagination URL/,
  );
  await assert.rejects(client.customers("proj/1", "", "/v2/projects/other/customers"), /pagination URL/);
  assert.equal(urls.length, before);
});
test("permission failures identify the precise feature scope", async () => {
  const client = new ExplorerClient("test", (async () => response({}, 403)) as typeof fetch);
  await assert.rejects(client.customers("p", ""), /customer_information:customers:read/);
  await assert.rejects(client.products("p"), /project_configuration:products:read/);
  await assert.rejects(client.subscriptions("p", "c", "production"), /customer_information:subscriptions:read/);
});
test("revenue validates exact returned dates and numeric values", async () => {
  const range = { start: "2026-09-01", end: "2026-09-30" };
  const client = new ExplorerClient("test", (async () =>
    response({
      value: 123.45,
      currency: "EUR",
      start_date: range.start,
      end_date: range.end,
      revenue_type: "revenue",
    })) as typeof fetch);
  assert.equal((await client.revenue("p", range, "EUR")).value, 123.45);
  const bad = new ExplorerClient("test", (async () =>
    response({ value: "123", currency: "EUR", start_date: range.start, end_date: range.end })) as typeof fetch);
  await assert.rejects(bad.revenue("p", range, "EUR"), /Unexpected/);
});
