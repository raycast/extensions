import { test } from "node:test";
import assert from "node:assert/strict";
import { inFlight } from "../src/lib/inflight.ts";
import { rateLimitMessage } from "../src/lib/rate-limit.ts";
import { fetchText, RequestTimeout } from "../src/lib/timed-fetch.ts";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

test("concurrent identical requests share one call; the next one starts fresh", async () => {
  const share = inFlight<number>();
  let calls = 0;
  const start = async () => {
    calls += 1;
    await sleep(10);
    return calls;
  };
  const [a, b, c] = await Promise.all([
    share("/accounts", start),
    share("/accounts", start),
    share("/accounts", start),
  ]);
  assert.deepEqual([a, b, c], [1, 1, 1]);
  assert.equal(calls, 1, "the Menu Bar's two /accounts loads become one request");
  assert.equal(await share("/accounts", start), 2, "a later call isn't served the old result");
});

test("different keys don't share, and a failure is shared then forgotten", async () => {
  const share = inFlight<string>();
  let calls = 0;
  const fail = async () => {
    calls += 1;
    await sleep(5);
    throw new Error("429");
  };
  const results = await Promise.allSettled([share("a", fail), share("a", fail), share("b", fail)]);
  assert.ok(results.every((r) => r.status === "rejected"));
  assert.equal(calls, 2);
  assert.equal(await share("a", async () => "ok"), "ok");
});

test("the 429 message uses SnapTrade's limit and reset headers", () => {
  const headers = new Map([
    ["x-ratelimit-account-limit", "10"],
    ["x-ratelimit-account-reset", "54"],
  ]);
  assert.equal(
    rateLimitMessage((n) => headers.get(n) ?? null),
    "SnapTrade's rate limit for this account was reached (10 requests a minute); try again in 54 s",
  );
  assert.equal(
    rateLimitMessage(() => null),
    "SnapTrade's rate limit for this account was reached; try again in a minute",
  );
});

test("a request with no answer, or a body that stalls, fails with RequestTimeout instead of hanging", async () => {
  const { createServer } = await import("node:http");
  const server = createServer((req, res) => {
    if (req.url === "/stall-body") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.write('{"partial":');
    }
    // "/hang": never respond at all
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as { port: number };
  try {
    for (const path of ["/hang", "/stall-body"]) {
      const started = Date.now();
      await assert.rejects(fetchText(`http://127.0.0.1:${port}${path}`, {}, 150), (e: unknown) => {
        return e instanceof RequestTimeout && e.ms === 150 && /didn't respond within 0.15 s/.test(e.message);
      });
      assert.ok(Date.now() - started < 2000, `${path} gave up promptly`);
    }
    // A normal response is returned with its status, headers and body.
    const ok = createServer((_, res) => {
      res.writeHead(429, { "X-RateLimit-Account-Reset": "54" });
      res.end("{}");
    });
    await new Promise<void>((r) => ok.listen(0, "127.0.0.1", r));
    const okPort = (ok.address() as { port: number }).port;
    const res = await fetchText(`http://127.0.0.1:${okPort}/`, {}, 1000);
    assert.equal(res.status, 429);
    assert.equal(res.headers.get("x-ratelimit-account-reset"), "54");
    assert.equal(res.raw, "{}");
    ok.close();
  } finally {
    server.closeAllConnections();
    server.close();
  }
});
