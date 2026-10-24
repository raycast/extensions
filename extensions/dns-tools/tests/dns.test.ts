import assert from "node:assert/strict";
import test from "node:test";
import {
  answersMatch,
  checkDns,
  normalizeDomain,
  type ResolverResult,
} from "../src/dns.ts";

test("validates and normalizes domains", () => {
  assert.equal(normalizeDomain(" Example.COM. "), "example.com");
  assert.throws(() => normalizeDomain("bad..example"));
  assert.throws(() => normalizeDomain("https://example.com"));
});

test("compares records independent of order and TTL", () => {
  const results: ResolverResult[] = [
    {
      resolver: "a",
      kind: "answer",
      records: [
        { data: "2.2.2.2", ttl: 10 },
        { data: "1.1.1.1", ttl: 20 },
      ],
    },
    {
      resolver: "b",
      kind: "answer",
      records: [
        { data: "1.1.1.1", ttl: 30 },
        { data: "2.2.2.2", ttl: 40 },
      ],
    },
  ];
  assert.equal(answersMatch(results, "A"), true);
  assert.equal(
    answersMatch(
      [{ ...results[0] }, { resolver: "b", kind: "no-record", detail: "none" }],
      "A",
    ),
    false,
  );
});

test("does not treat TXT presentation quotes as a different answer", () => {
  const results: ResolverResult[] = [
    {
      resolver: "Google",
      kind: "answer",
      records: [{ data: "v=spf1 -all", ttl: 20 }],
    },
    {
      resolver: "Cloudflare",
      kind: "answer",
      records: [{ data: '"v=spf1 -all"', ttl: 30 }],
    },
  ];
  assert.equal(answersMatch(results, "TXT"), true);
});

test("queries both resolvers and distinguishes no record", async () => {
  const requests: URL[] = [];
  const fakeFetch = (async (input: URL) => {
    requests.push(input);
    return new Response(
      JSON.stringify({
        Status: 0,
        Answer: [{ type: 28, TTL: 50, data: "::1" }],
      }),
      { status: 200 },
    );
  }) as typeof fetch;
  const results = await checkDns("example.com", "A", fakeFetch);
  assert.equal(requests.length, 2);
  assert.equal(results[0].kind, "no-record");
  assert.equal(results[1].kind, "no-record");
});

test("reports HTTP and network failures separately", async () => {
  let count = 0;
  const fakeFetch = (async () => {
    count += 1;
    if (count === 1) return new Response("error", { status: 503 });
    throw new TypeError("network unavailable");
  }) as typeof fetch;
  const results = await checkDns("example.com", "A", fakeFetch);
  assert.deepEqual(results.map((result) => result.kind).sort(), [
    "http-error",
    "network-error",
  ]);
  assert.equal(answersMatch(results, "A"), undefined);
});
