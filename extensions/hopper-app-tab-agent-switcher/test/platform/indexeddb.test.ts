import { test } from "node:test";
import assert from "node:assert/strict";
import { deserialize, serialize } from "node:v8";
import { snappyDecompress, v8Payload } from "../../src/lib/platform/indexeddb.ts";

/** Raw Snappy with only literals (what a compressor emits for incompressible input). */
function snappyLiterals(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (let n = data.length; ; n = Math.floor(n / 128)) {
    out.push((n & 0x7f) | (n >= 128 ? 0x80 : 0));
    if (n < 128) break;
  }
  for (let i = 0; i < data.length; i += 256) {
    const chunk = data.subarray(i, i + 256);
    out.push(60 << 2, chunk.length - 1, ...chunk);
  }
  return Uint8Array.from(out);
}

/** A blob file as Chromium writes it: wrapper, Snappy, Blink header with trailer offset, V8 at `wire`. */
function blobFile(value: unknown, wire = 16): Uint8Array {
  const v8 = Uint8Array.from(serialize(value));
  v8[1] = wire;
  const blink = Uint8Array.from([0xff, 0x15, 0xfe, ...new Array(12).fill(0), ...v8]);
  return Uint8Array.from([0xff, 0x11, 0x02, ...snappyLiterals(blink)]);
}

test("Snappy: literals and overlapping back-references", () => {
  const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
  // "abc", then copy 6 bytes from 3 back: the copy reads what it writes.
  assert.equal(text(snappyDecompress(Uint8Array.from([9, 0x08, 97, 98, 99, 0x09, 0x03]))), "abcabcabc");
  assert.throws(() => snappyDecompress(Uint8Array.from([9, 0x08, 97, 98, 99])), /short/);
  assert.throws(() => snappyDecompress(Uint8Array.from([4, 0x09, 0x05])), /out of bounds/);
});

test("IndexedDB blob: unwraps Chromium's Snappy and Blink's header, reads V8 wire 16 as 15", () => {
  const state = { selfTeamIds: { teamId: "T1" }, channels: { C1: { id: "C1", name: "general" } }, n: [1, 2] };
  assert.deepEqual(deserialize(v8Payload(blobFile(state))), state);
  assert.deepEqual(deserialize(v8Payload(blobFile(state, 15))), state);
});

test("IndexedDB blob: unknown layouts and newer V8 versions throw instead of misreading", () => {
  assert.throws(() => v8Payload(blobFile({}, 17)), /wire version 17/);
  assert.throws(() => v8Payload(Uint8Array.from([0xff, 0x11, 0x01, 0])), /unknown wrapper/);
  assert.throws(() => v8Payload(Uint8Array.from([0x00, 0x01])), /Blink header/);
});
