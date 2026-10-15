import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { beforeEach, test } from "node:test";
import { checkWord, solveProofOfWork } from "../src/api.ts";

const digest = webcrypto.subtle.digest.bind(webcrypto.subtle);
const result = (word: string) => ({ word, is_new: true, discovered_at: "2026-03-19T00:00:00Z", search_count: 1 });

beforeEach((t) => {
  assert.ok("mock" in t);
  // Keep every synthetic proof to one iteration, and clean up cache expiry timers.
  t.mock.method(webcrypto.subtle, "digest", async () => new Uint8Array(32).buffer);
  t.mock.timers.enable({ apis: ["setTimeout"] });
});

test("a real SHA-256 proof uses the normalized word, timestamp and nonce", async (t) => {
  t.mock.method(webcrypto.subtle, "digest", digest);
  t.mock.method(Date, "now", () => 1700000015690);
  const proof = await solveProofOfWork("PROOF");
  assert.deepEqual(proof, { nonce: "0", timestamp: 1700000015690 });
  assert.match(createHash("sha256").update(`proof|${proof.timestamp}|${proof.nonce}`).digest("hex"), /^0000/);
});

test("cancellation during the final successful digest stops before a network request", async (t) => {
  const controller = new AbortController();
  let finish!: (value: ArrayBuffer) => void;
  const hash = t.mock.method(
    webcrypto.subtle,
    "digest",
    () =>
      new Promise<ArrayBuffer>((resolve) => {
        finish = resolve;
      }),
  );
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("must not fetch");
  });
  const pending = checkWord("cancelproof", controller.signal);
  controller.abort();
  finish(new Uint8Array(32).buffer);
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(hash.mock.callCount(), 1);
  assert.equal(fetch.mock.callCount(), 0);
});

test("cancellation between unsuccessful digest iterations does not keep computing", async (t) => {
  const controller = new AbortController();
  const hash = t.mock.method(webcrypto.subtle, "digest", async () => {
    controller.abort();
    return new Uint8Array(32).fill(255).buffer;
  });
  await assert.rejects(solveProofOfWork("canceliteration", controller.signal), { name: "AbortError" });
  assert.equal(hash.mock.callCount(), 1);
});

test("successful checks send the normalized word and proof, and reuse a recent result", async (t) => {
  const controller = new AbortController();
  const fetch = t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    assert.equal(_url, "https://wordresearch.xyz/api/check");
    assert.equal(options.signal, controller.signal.aborted ? undefined : controller.signal);
    assert.equal(options.method, "POST");
    const body = JSON.parse(String(options.body));
    assert.equal(body.word, "café");
    assert.equal(body.nonce, "0");
    assert.equal(typeof body.timestamp, "number");
    return Response.json(result("café"));
  });
  assert.deepEqual(await checkWord(" CAFÉ ", controller.signal), result("café"));
  assert.deepEqual(await checkWord("café"), result("café"));
  assert.equal(fetch.mock.callCount(), 1);
  controller.abort();
  await assert.rejects(checkWord("café", controller.signal), { name: "AbortError" });
  assert.equal(fetch.mock.callCount(), 1);
  t.mock.timers.tick(5000);
  assert.deepEqual(await checkWord("café"), result("café"));
  assert.equal(fetch.mock.callCount(), 2);
});

test("aborts an in-flight request and allows checking another word", async (t) => {
  const controller = new AbortController();
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    const word = JSON.parse(String(options.body)).word;
    if (word !== "cancelrequest") return Response.json(result(word));
    return new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
      started();
    });
  });
  const pending = checkWord("cancelrequest", controller.signal);
  await ready;
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.deepEqual(await checkWord("nextword"), result("nextword"));
});

test("late cancelled response bodies cannot populate the recent-result cache", async (t) => {
  const controller = new AbortController();
  let finish!: (value: ReturnType<typeof result>) => void;
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    const response = Response.json(result("cancelbody"));
    if (controller.signal.aborted) return response;
    t.mock.method(
      response,
      "json",
      () =>
        new Promise((resolve) => {
          finish = resolve;
          started();
        }),
    );
    return response;
  });
  const pending = checkWord("cancelbody", controller.signal);
  await ready;
  controller.abort();
  finish(result("cancelbody"));
  await assert.rejects(pending, { name: "AbortError" });
  assert.deepEqual(await checkWord("cancelbody"), result("cancelbody"));
  assert.equal(fetch.mock.callCount(), 2);
});

test("JSON, non-JSON and network failures can be followed by a successful retry", async (t) => {
  let attempts = 0;
  const responses = [
    Response.json({ error: "Try later" }, { status: 429 }),
    new Response("bad gateway", { status: 502 }),
  ];
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    attempts += 1;
    const response = responses.shift();
    if (response) return response;
    if (attempts === 3) throw new Error("offline");
    return Response.json(result("retryword"));
  });
  await assert.rejects(checkWord("retryword"), /Try later/);
  await assert.rejects(checkWord("retryword"), /Request failed \(502\)/);
  await assert.rejects(checkWord("retryword"), /offline/);
  assert.deepEqual(await checkWord("retryword"), result("retryword"));
  assert.equal(fetch.mock.callCount(), 4);
});
