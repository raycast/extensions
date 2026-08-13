import assert from "node:assert/strict";
import test from "node:test";
import { fetchOptionalEnrichment } from "../src/providers/utils/optional-enrichment";
import { RequestTimeoutError } from "../src/utils/request-timeout";

test("omits optional enrichment after its own timeout", async () => {
  const result = await fetchOptionalEnrichment(
    new AbortController().signal,
    (signal) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason))),
    5,
  );

  assert.equal(result, undefined);
});

test("propagates parent cancellation instead of treating it as optional failure", async () => {
  const controller = new AbortController();
  const request = fetchOptionalEnrichment(
    controller.signal,
    (signal) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason))),
    1_000,
  );
  controller.abort(new Error("Superseded refresh"));

  await assert.rejects(request, /Superseded refresh/);
});

test("omits enrichment when the provider deadline expires after core data is available", async () => {
  const controller = new AbortController();
  const request = fetchOptionalEnrichment(
    controller.signal,
    (signal) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason))),
    1_000,
  );
  controller.abort(new RequestTimeoutError("Status request timed out"));

  assert.equal(await request, undefined);
});

test("omits an ordinary enrichment error", async () => {
  const result = await fetchOptionalEnrichment(new AbortController().signal, async () => {
    throw new Error("History endpoint unavailable");
  });

  assert.equal(result, undefined);
});
