import assert from "node:assert/strict";
import { test } from "node:test";
import { requestPeople } from "../src/people-client.ts";

test("startup retries stop when People never becomes available", async (t) => {
  let now = 0;
  t.mock.method(Date, "now", () => (now += 8000));
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("fetch failed");
  });
  const launch = t.mock.fn(async () => {});
  await assert.rejects(
    requestPeople(
      "/search?q=",
      "test-key",
      new AbortController().signal,
      launch,
    ),
    /fetch failed/,
  );
  assert.equal(fetch.mock.callCount(), 2);
  assert.equal(launch.mock.callCount(), 1);
});

test("a running app receives the key without a launch", async (t) => {
  const expected = new Response('{"version":2,"contacts":[]}');
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "http://127.0.0.1:47631/v2/search?q=Ada");
    assert.equal(options.headers.Authorization, "Bearer test-key");
    assert.equal(options.cache, "no-store");
    return expected;
  });
  const launch = t.mock.fn();
  assert.equal(
    await requestPeople(
      "/search?q=Ada",
      "test-key",
      new AbortController().signal,
      launch,
    ),
    expected,
  );
  assert.equal(launch.mock.callCount(), 0);
});

test("a closed app is launched and retried until its listener starts", async (t) => {
  let requests = 0;
  const expected = new Response("{}");
  t.mock.method(globalThis, "fetch", async () => {
    if (++requests < 3) throw new TypeError("fetch failed");
    return expected;
  });
  const launch = t.mock.fn(async () => {});
  assert.equal(
    await requestPeople(
      "/contact?id=one",
      "test-key",
      new AbortController().signal,
      launch,
    ),
    expected,
  );
  assert.equal(requests, 3);
  assert.equal(launch.mock.callCount(), 1);
});

test("authentication and subscription errors do not launch or retry", async (t) => {
  for (const status of [401, 403, 503]) {
    const fetch = t.mock.method(
      globalThis,
      "fetch",
      async () => new Response("", { status }),
    );
    const launch = t.mock.fn();
    const response = await requestPeople(
      "/search?q=",
      "test-key",
      new AbortController().signal,
      launch,
    );
    assert.equal(response.status, status);
    assert.equal(fetch.mock.callCount(), 1);
    assert.equal(launch.mock.callCount(), 0);
    fetch.mock.restore();
  }
});

test("cancelled searches never start People", async (t) => {
  const controller = new AbortController();
  controller.abort();
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    assert.fail("unexpected request"),
  );
  const launch = t.mock.fn();
  await assert.rejects(
    requestPeople("/search?q=", "test-key", controller.signal, launch),
    { name: "AbortError" },
  );
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(launch.mock.callCount(), 0);
});

test("changing the query cancels startup retries", async (t) => {
  const controller = new AbortController();
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("fetch failed");
  });
  const launch = t.mock.fn(async () => controller.abort());
  await assert.rejects(
    requestPeople("/search?q=", "test-key", controller.signal, launch),
    { name: "AbortError" },
  );
  assert.equal(fetch.mock.callCount(), 1);
});

test("an uninstalled app reports launch failure without retrying", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("fetch failed");
  });
  await assert.rejects(
    requestPeople(
      "/search?q=",
      "test-key",
      new AbortController().signal,
      async () => {
        throw new Error("App not found");
      },
    ),
    /App not found/,
  );
  assert.equal(fetch.mock.callCount(), 1);
});
