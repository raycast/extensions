import assert from "node:assert/strict";
import { test } from "node:test";
import { createLookupClient, normalizeQuery, parseResponse, websiteUrl } from "../src/lib/lookup";

const signal = () => new AbortController().signal;
const known = [{ name: "yyds", trans: ["永远的神", "永远滴神（示例注释）"] }];

test("extracts only upstream ASCII tokens, normalizes case, and deduplicates", () => {
  assert.equal(normalizeQuery("这是 YYDS，nsdd / yyds！123 a 中文 KK"), "yyds,nsdd,123");
  assert.equal(normalizeQuery("中文 a ! 😀"), "");
  assert.equal(websiteUrl("YYDS nsdd"), "https://lab.magiconch.com/nbnhhsh/#/text/yyds%2Cnsdd");
  assert.equal(websiteUrl(""), "https://lab.magiconch.com/nbnhhsh/");
});

test("preserves dictionary order and notes while separating tentative and missing results", () => {
  assert.deepEqual(
    parseResponse(
      [
        { name: "nsdd", inputting: ["你说得对"] },
        ...known,
        { name: "none", trans: null, inputting: ["must not appear"] },
        { name: "empty", inputting: [] },
        { name: "nullfallback", inputting: null },
      ],
      "YYDS nsdd none empty nullfallback missing",
    ),
    [
      { name: "yyds", kind: "dictionary", meanings: known[0].trans },
      { name: "nsdd", kind: "suggestion", meanings: ["你说得对"] },
      { name: "none", kind: "none", meanings: [] },
      { name: "empty", kind: "none", meanings: [] },
      { name: "nullfallback", kind: "none", meanings: [] },
      { name: "missing", kind: "none", meanings: [] },
    ],
  );
});

test("rejects malformed results and unrelated or duplicated groups", () => {
  for (const value of [
    {},
    [null],
    [{ name: "yyds" }],
    [{ name: "yyds", trans: "not an array" }],
    [{ name: "yyds", inputting: [42] }],
    [{ name: "other", trans: ["unrelated"] }],
    [...known, ...known],
  ]) {
    assert.throws(() => parseResponse(value, "yyds"), /unexpected response/);
  }
});

test("sends extracted tokens only, in one anonymous lookup request", async () => {
  let calls = 0;
  const client = createLookupClient(async (url, options) => {
    calls++;
    assert.equal(url, "https://lab.magiconch.com/api/nbnhhsh/guess");
    assert.equal(options?.method, "POST");
    assert.equal(options?.body, JSON.stringify({ text: "yyds,nsdd" }));
    assert.deepEqual(options?.headers, { "Content-Type": "application/json", Accept: "application/json" });
    assert.ok(options?.signal);
    return Response.json([...known, { name: "nsdd", trans: ["你说的对"] }]);
  });
  assert.deepEqual(await client.lookup("中文 a", signal()), []);
  assert.equal(calls, 0);
  const groups = await client.lookup("这里是 YYDS，nsdd！yyds", signal());
  assert.equal(groups.length, 2);
  assert.equal(calls, 1);
});

test("caches normalized queries briefly and lets retry invalidate a result", async () => {
  let calls = 0;
  let time = 0;
  const client = createLookupClient(
    async () => {
      calls++;
      return Response.json(known);
    },
    () => time,
  );
  await client.lookup("YYDS", signal());
  await client.lookup("yyds yyds", signal());
  assert.equal(calls, 1);
  time = 5 * 60 * 1000;
  await client.lookup("yyds", signal());
  assert.equal(calls, 2);
  client.invalidate("YYDS");
  await client.lookup("yyds", signal());
  assert.equal(calls, 3);
});

test("bounds the memory cache", async () => {
  let calls = 0;
  const client = createLookupClient(async (_url, options) => {
    calls++;
    const { text } = JSON.parse(options?.body as string);
    return Response.json([{ name: text, inputting: [] }]);
  });
  for (let index = 0; index < 51; index++) await client.lookup(`term${index}`, signal());
  await client.lookup("term0", signal());
  assert.equal(calls, 52);
});

test("distinguishes network, rate-limit, HTTP, and invalid-JSON failures", async () => {
  for (const [status, body, message] of [
    [429, "", /Too many requests/],
    [503, "", /HTTP 503/],
    [200, "<html>Unavailable</html>", /unexpected response/],
  ] as const) {
    const client = createLookupClient(async () => new Response(body, { status }));
    await assert.rejects(client.lookup("yyds", signal()), message);
  }
  const client = createLookupClient(async () => {
    throw new TypeError("fetch failed");
  });
  await assert.rejects(client.lookup("yyds", signal()), /Check your connection/);
});

test("failed lookups can be retried without a cached failure", async () => {
  let calls = 0;
  const client = createLookupClient(async () => {
    calls++;
    return calls === 1 ? new Response("", { status: 503 }) : Response.json(known);
  });
  await assert.rejects(client.lookup("yyds", signal()));
  assert.equal((await client.lookup("yyds", signal()))[0].meanings[0], "永远的神");
  assert.equal(calls, 2);
});

test("cancels obsolete requests and never caches their late response", async () => {
  const controller = new AbortController();
  let calls = 0;
  const client = createLookupClient(async () => {
    calls++;
    if (calls === 1) controller.abort();
    return Response.json(known);
  });
  await assert.rejects(client.lookup("yyds", controller.signal), { name: "AbortError" });
  await client.lookup("yyds", signal());
  assert.equal(calls, 2);
  await assert.rejects(client.lookup("yyds", controller.signal), { name: "AbortError" });
});

test("reports a request timeout separately from cancellation", async (t) => {
  const timeout = new AbortController();
  t.mock.method(AbortSignal, "timeout", () => timeout.signal);
  const client = createLookupClient(async (_url, options) => {
    timeout.abort(new DOMException("Timed out", "TimeoutError"));
    options?.signal?.throwIfAborted();
    return Response.json(known);
  });
  await assert.rejects(client.lookup("yyds", signal()), /lookup timed out/);
});
