import assert from "node:assert/strict";
import { test } from "node:test";
import { checkNumber } from "../src/api.ts";

const result = (number: string) => ({ number, is_new: true, discovered_at: "2026-03-06T00:00:00Z", search_count: 1 });

test("successful checks pass the signal and preserve the number payload without proof-of-work", async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.equal(url, "https://numberresearch.xyz/api/check");
    assert.equal(options.method, "POST");
    assert.equal(options.signal, controller.signal);
    assert.deepEqual(JSON.parse(String(options.body)), { number: "000123" });
    return Response.json(result("000123"));
  });
  assert.deepEqual(await checkNumber("000123", controller.signal), result("000123"));
});

test("already cancelled checks never send a request", async (t) => {
  const controller = new AbortController();
  controller.abort();
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("must not fetch");
  });
  await assert.rejects(checkNumber("123", controller.signal), { name: "AbortError" });
  assert.equal(fetch.mock.callCount(), 0);
});

test("cancellation during the request aborts it and another number can be checked", async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    const number = JSON.parse(String(options.body)).number;
    if (number !== "123") return Response.json(result(number));
    return new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
    });
  });
  const pending = checkNumber("123", controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.deepEqual(await checkNumber("456"), result("456"));
});

test("cancellation while parsing the body discards a late response", async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async () => {
    const response = Response.json(result("789"));
    t.mock.method(response, "json", async () => {
      controller.abort();
      return result("789");
    });
    return response;
  });
  await assert.rejects(checkNumber("789", controller.signal), { name: "AbortError" });
});

test("HTTP and network failures allow a successful retry of the same number", async (t) => {
  let attempts = 0;
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    attempts += 1;
    if (attempts === 1) return new Response("bad gateway", { status: 502 });
    if (attempts === 2) throw new Error("offline");
    return Response.json(result("123"));
  });
  await assert.rejects(checkNumber("123"), /Request failed \(502\)/);
  await assert.rejects(checkNumber("123"), /offline/);
  assert.deepEqual(await checkNumber("123"), result("123"));
  assert.equal(fetch.mock.callCount(), 3);
});
