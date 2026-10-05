import test from "node:test";
import assert from "node:assert/strict";
import { createClient, validateConnection, itemId, positiveInt, query, cleanHighlight } from "../src/lib/api-core";
import { preview } from "../src/lib/content";
const config = { token: "synthetic-test-credential", port: "9200" };
function transport(fn: (url: string, init: RequestInit) => Response | Promise<Response>): typeof fetch {
  return (async (url, init) => fn(String(url), init!)) as typeof fetch;
}
const ok = () =>
  Response.json({ status: "success", data: [{ id: "fixture-1", title: "Synthetic TODO", folder: "fixture-folder" }] });
test("restrict ports and validate token", () => {
  for (const port of ["9199", "9701", "9200@evil.example", "9200/path", "9200.0", ""])
    assert.throws(() => validateConnection({ ...config, port }));
  for (const token of ["", " ", "fake\r\nInjected: value"])
    assert.throws(() => validateConnection({ ...config, token }));
  assert.equal(validateConnection({ ...config, port: "9700" }).port, "9700");
});
test("HTTP is loopback only, header-only auth, no redirects", async () => {
  const client = createClient(
    config,
    transport((url, init) => {
      assert.equal(url, "http://127.0.0.1:9200/third-party/notes?limit=3");
      assert.equal(init.redirect, "error");
      assert.equal(new Headers(init.headers).get("Authorization"), `Bearer ${config.token}`);
      assert.ok(init.signal);
      assert.ok(!url.includes(config.token));
      return ok();
    }),
  );
  assert.equal((await client<unknown[]>("/notes?limit=3")).data.length, 1);
});
test("reject arbitrary paths", async () => {
  const client = createClient(
    config,
    transport(() => {
      throw new Error("must not be called");
    }),
  );
  for (const path of [
    "https://evil.example",
    "//evil.example",
    "/notes/../version",
    "/notes\\evil",
    "/notes#fragment",
    "/config",
  ])
    await assert.rejects(client(path), /Unsupported API path/);
});
test("health never sends authentication", async () => {
  const client = createClient(
    config,
    transport((url, init) => {
      assert.equal(url, "http://127.0.0.1:9200/health");
      assert.equal(new Headers(init.headers).get("Authorization"), null);
      return Response.json({ port: 9200 });
    }),
  );
  await client("/version", { health: true });
});
test("auth errors never echo server secrets", async () => {
  for (const status of [401, 403]) {
    const client = createClient(
      config,
      transport(() => new Response(config.token, { status })),
    );
    await assert.rejects(
      client("/notes"),
      (e: Error) => !e.message.includes(config.token) && e.message.includes("Authentication failed"),
    );
  }
});
test("network errors never echo credentials", async () => {
  const client = createClient(
    config,
    transport(() => {
      throw new Error(config.token);
    }),
  );
  await assert.rejects(
    client("/notes"),
    (e: Error) => !e.message.includes(config.token) && e.message.includes("Cannot reach"),
  );
});
test("non-success envelope rejected even for HTTP 200", async () => {
  const client = createClient(
    config,
    transport(() => Response.json({ status: "error", error: { message: config.token } })),
  );
  await assert.rejects(client("/notes"), /rejected the request/);
});
test("invalid JSON rejected without echoing body", async () => {
  const client = createClient(
    config,
    transport(() => new Response(config.token)),
  );
  await assert.rejects(client("/notes"), /invalid JSON/);
});
test("HTTP errors use safe messages", async () => {
  for (const status of [404, 429, 500]) {
    const client = createClient(
      config,
      transport(() => new Response(config.token, { status })),
    );
    await assert.rejects(client("/notes"), (e: Error) => !e.message.includes(config.token));
  }
});
test("writes preserve Unicode content and are not retried", async () => {
  let calls = 0;
  const content = '中文 TODO \"quoted\" \n $(not-a-shell-command) 📝';
  const client = createClient(
    config,
    transport((url, init) => {
      calls++;
      assert.equal(init.method, "PUT");
      assert.deepEqual(JSON.parse(String(init.body)), { content });
      return new Response("Synthetic failure", { status: 500 });
    }),
  );
  await assert.rejects(client("/notes/fixture-1", { method: "PUT", body: { content } }));
  assert.equal(calls, 1);
});
test("IDs, limits, and query strings are validated/encoded", () => {
  for (const id of ["../x", "x/y", "", "?token=x"]) assert.throws(() => itemId(id));
  assert.equal(itemId("fixture-1"), "fixture-1");
  for (const n of [0, -1, 101, 1.5, NaN]) assert.throws(() => positiveInt(n));
  assert.equal(new URLSearchParams(query({ query: "中文 & TODO", folder: undefined })).get("query"), "中文 & TODO");
});
test("strip only known search highlighting", () => {
  assert.equal(cleanHighlight("<em>TODO</em> <literal>"), "TODO <literal>");
});
test("preview removes image URLs and active HTML", () => {
  for (const content of [
    '<p>Hello</p><img src="https://tracker.invalid/pixel"><script>alert(1)</script>',
    "![secret](https://tracker.invalid/pixel)",
    "![secret][ref]\n[ref]: https://tracker.invalid/pixel",
    "[Click](https://tracker.invalid/link)",
  ]) {
    const output = preview(content);
    assert.ok(!output.includes("https://tracker.invalid"));
    assert.ok(!output.includes("alert(1)"));
  }
});
