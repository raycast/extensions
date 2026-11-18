import assert from "node:assert/strict";
import test from "node:test";
import { decodeBase64, encodeBase64 } from "../src/lib/base64";

test("UTF-8 round trip preserves Chinese, emoji, whitespace, empty text, and BOM", () => {
  for (const variant of ["base64", "base64url"] as const) {
    for (const text of ["你好 👋", "\n hello\t\n", "", "\uFEFFtext"]) {
      assert.equal(decodeBase64(encodeBase64(text, variant), variant), text);
    }
  }
  assert.equal(encodeBase64("Hello"), "SGVsbG8=");
});

test("decode allows whitespace and missing padding", () => {
  assert.equal(decodeBase64(" SGVs\nbG8= \r\n"), "Hello");
  assert.equal(decodeBase64("SGVsbG8"), "Hello");
  assert.equal(decodeBase64("Zg"), "f");
});

test("Base64URL uses its own alphabet and no output padding", () => {
  const text = "😃";
  assert.equal(encodeBase64(text, "base64url"), "8J-Ygw");
  assert.equal(decodeBase64("8J-Ygw", "base64url"), text);
  assert.throws(() => decodeBase64("8J-Ygw", "base64"));
  assert.throws(() => decodeBase64("8J+Ygw==", "base64url"));
});

test("rejects malformed input instead of silently decoding it", () => {
  for (const input of ["!", "a", "Zg=", "Zg===", "Z=g=", "Zh==", "====", "Zm9v="]) {
    assert.throws(() => decodeBase64(input), input);
  }
  assert.throws(() => decodeBase64("/w=="), /UTF-8/);
});
