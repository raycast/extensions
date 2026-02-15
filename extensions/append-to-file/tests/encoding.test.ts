import assert from "node:assert/strict";
import test from "node:test";
import { decodeTextBuffer, encodeTextBuffer } from "../src/lib/encoding.ts";

function toUtf16Be(text: string): Buffer {
  const bytes = Buffer.from(text, "utf16le");
  bytes.swap16();
  return bytes;
}

test("decode/encode preserves UTF-8 with BOM", () => {
  const text = "alpha\nbeta";
  const input = Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    Buffer.from(text, "utf8"),
  ]);

  const decoded = decodeTextBuffer(input);
  assert.equal(decoded.text, text);
  assert.deepEqual(decoded.encoding, { name: "utf8", bom: true });

  const encoded = encodeTextBuffer(decoded.text, decoded.encoding);
  assert.equal(encoded.equals(input), true);
});

test("decode/encode preserves UTF-16LE with BOM", () => {
  const text = "Line one\nLine two";
  const input = Buffer.concat([
    Buffer.from([0xff, 0xfe]),
    Buffer.from(text, "utf16le"),
  ]);

  const decoded = decodeTextBuffer(input);
  assert.equal(decoded.text, text);
  assert.deepEqual(decoded.encoding, { name: "utf16le", bom: true });

  const encoded = encodeTextBuffer(decoded.text, decoded.encoding);
  assert.equal(encoded.equals(input), true);
});

test("decode/encode preserves UTF-16BE with BOM", () => {
  const text = "First\nSecond";
  const input = Buffer.concat([Buffer.from([0xfe, 0xff]), toUtf16Be(text)]);

  const decoded = decodeTextBuffer(input);
  assert.equal(decoded.text, text);
  assert.deepEqual(decoded.encoding, { name: "utf16be", bom: true });

  const encoded = encodeTextBuffer(decoded.text, decoded.encoding);
  assert.equal(encoded.equals(input), true);
});

test("detects UTF-16LE without BOM by null-byte pattern", () => {
  const text = "ASCII only";
  const input = Buffer.from(text, "utf16le");

  const decoded = decodeTextBuffer(input);
  assert.equal(decoded.text, text);
  assert.deepEqual(decoded.encoding, { name: "utf16le", bom: false });
});

test("recovers from corrupted UTF-16LE BOM prefix produced by UTF-8 rewrite", () => {
  const text = "Men occasionally stumble over the truth.";
  const corruptPrefix = Buffer.from([0xef, 0xbf, 0xbd, 0xef, 0xbf, 0xbd]);
  const input = Buffer.concat([corruptPrefix, Buffer.from(text, "utf16le")]);

  const decoded = decodeTextBuffer(input);
  assert.equal(decoded.text, text);
  assert.deepEqual(decoded.encoding, { name: "utf16le", bom: true });
  assert.equal(decoded.recoveredFromCorruptUtf16Bom, true);

  const encoded = encodeTextBuffer(decoded.text, decoded.encoding);
  assert.equal(encoded.subarray(0, 2).toString("hex"), "fffe");
  assert.notEqual(
    encoded.subarray(0, 6).toString("hex"),
    corruptPrefix.toString("hex"),
  );
});
