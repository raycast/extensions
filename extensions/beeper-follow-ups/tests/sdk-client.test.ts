import { test } from "node:test";
import assert from "node:assert/strict";
import BeeperDesktop from "@beeper/desktop-api";
import { sdkClient } from "../src/sdk-client";

function client(fetch: typeof globalThis.fetch) {
  return sdkClient(
    new BeeperDesktop({
      accessToken: "synthetic-fixture-token",
      baseURL: "http://localhost:23373",
      maxRetries: 1,
      logLevel: "off",
      fetch,
    }),
  );
}

test("a lost draft response does not replay the composer mutation", async () => {
  let attempts = 0;
  let composer = "";
  const c = client(async (url, init) => {
    assert.equal(String(url), "http://localhost:23373/v1/focus");
    assert.equal(init?.method, "POST");
    attempts++;
    const params = JSON.parse(String(init?.body));
    composer = params.draftText;
    throw new TypeError("Synthetic response loss after composer changed");
  });
  await assert.rejects(c.focus({ chatID: "fixture", draftText: "Unsent" }));
  assert.equal(composer, "Unsent");
  assert.equal(attempts, 1);
});

test("focus does not retry an ambiguous HTTP error", async () => {
  let attempts = 0;
  const c = client(async () => {
    attempts++;
    return new Response(JSON.stringify({ message: "Synthetic failure" }), {
      status: 500,
      headers: { "content-type": "application/json", "retry-after-ms": "1" },
    });
  });
  await assert.rejects(c.focus({ chatID: "fixture", messageID: "message" }));
  assert.equal(attempts, 1);
});

test("read calls keep the configured recovery retry", async () => {
  let attempts = 0;
  const c = client(async (url, init) => {
    assert.equal(String(url), "http://localhost:23373/v1/chats/fixture");
    assert.equal(init?.method, "GET");
    attempts++;
    return attempts === 1
      ? new Response(JSON.stringify({ message: "Synthetic failure" }), {
          status: 500,
          headers: {
            "content-type": "application/json",
            "retry-after-ms": "1",
          },
        })
      : new Response(JSON.stringify({ id: "fixture" }), {
          headers: { "content-type": "application/json" },
        });
  });
  assert.equal((await c.retrieveChat("fixture")).id, "fixture");
  assert.equal(attempts, 2);
});

test("member metadata requests forward the full participant query", async () => {
  let attempts = 0;
  const c = client(async (url, init) => {
    const requestURL = new URL(String(url));
    assert.equal(requestURL.pathname, "/v1/chats/fixture");
    assert.equal(requestURL.searchParams.get("maxParticipantCount"), "-1");
    assert.equal(init?.method, "GET");
    attempts++;
    return new Response(JSON.stringify({ id: "fixture" }), {
      headers: { "content-type": "application/json" },
    });
  });
  assert.equal(
    (await c.retrieveChat("fixture", { maxParticipantCount: -1 })).id,
    "fixture",
  );
  assert.equal(attempts, 1);
});
