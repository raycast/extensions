import { test } from "node:test";
import assert from "node:assert/strict";
import { readBounded, decodeImage } from "../src/lib/response";

test("rejects an oversized declared body before reading it", async () => {
  let cancelled = false;
  const response = new Response(
    new ReadableStream({
      cancel() {
        cancelled = true;
      },
    }),
    { headers: { "content-length": "100" } },
  );
  await assert.rejects(readBounded(response, 10), /size limit/);
  assert.equal(cancelled, true);
});
test("limits streamed bytes with missing or misleading Content-Length and cancels", async () => {
  for (const headers of [
    new Headers(),
    new Headers({ "content-length": "1" }),
  ]) {
    let cancelled = false;
    const response = new Response(
      new ReadableStream({
        pull(controller) {
          controller.enqueue(new Uint8Array(6));
        },
        cancel() {
          cancelled = true;
        },
      }),
      { headers },
    );
    await assert.rejects(readBounded(response, 10), /size limit/);
    assert.equal(cancelled, true);
  }
});
test("accepts exact limits and validates base64 decoded size including padding", async () => {
  assert.equal((await readBounded(new Response("1234"), 4)).toString(), "1234");
  assert.deepEqual(decodeImage("AQID", 3), Buffer.from([1, 2, 3]));
  assert.deepEqual(decodeImage("AQ==", 1), Buffer.from([1]));
  assert.throws(() => decodeImage("AQID", 2), /size limit/);
  assert.throws(() => decodeImage("AQIDBAUG", 3), /size limit/);
});
