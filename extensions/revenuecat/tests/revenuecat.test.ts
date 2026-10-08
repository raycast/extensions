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
