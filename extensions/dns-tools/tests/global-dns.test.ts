import assert from "node:assert/strict";
import test from "node:test";
import { checkGlobalDns, parseGlobalResults } from "../src/global-dns.ts";

test("maps city, network, and all selected DNS answers", () => {
  const results = parseGlobalResults({
    results: [{
      probe: { city: "Singapore", country: "SG", network: "Test ISP" },
      result: {
        status: "finished", statusCode: 0, resolver: "192.0.2.53",
        answers: [
          { type: "A", ttl: 120, value: "192.0.2.1" },
          { type: "A", ttl: 120, value: "192.0.2.2" },
          { type: "CNAME", ttl: 120, value: "other.example" },
        ],
      },
    }],
  }, "A");
  assert.equal(results[0].city, "Singapore");
  assert.equal(results[0].network, "Test ISP");
  assert.deepEqual(results[0].records.map((record) => record.data), ["192.0.2.1", "192.0.2.2"]);
});

test("creates and polls one free global measurement", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fakeFetch = (async (url: string, init?: RequestInit) => {
    requests.push({ url, init });
    if (requests.length === 1) return new Response(JSON.stringify({ id: "abc123" }), { status: 202 });
    if (requests.length === 2) return new Response(JSON.stringify({ status: "in-progress" }), { status: 200 });
    return new Response(JSON.stringify({ status: "finished", results: [] }), { status: 200 });
  }) as typeof fetch;
  const result = await checkGlobalDns("example.com", "A", fakeFetch, async () => {});
  assert.deepEqual(result, []);
  const body = JSON.parse(requests[0].init?.body as string);
  assert.equal(body.measurementOptions.query.type, "A");
  assert.equal(body.locations.length, 6);
  assert.equal(requests.length, 3);
});

test("reports free limit cleanly", async () => {
  const fakeFetch = (async () => new Response("limit", { status: 429 })) as typeof fetch;
  await assert.rejects(checkGlobalDns("example.com", "A", fakeFetch), /free hourly probe limit/);
});
