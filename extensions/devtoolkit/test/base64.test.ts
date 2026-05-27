import assert from "node:assert/strict";
import test from "node:test";

import { convertBase64 } from "../src/base64";

test("encodes UTF-8 text as Base64", () => {
  assert.equal(
    convertBase64("hello backend", "encode"),
    "aGVsbG8gYmFja2VuZA==",
  );
});

test("decodes Base64 as UTF-8 text", () => {
  assert.equal(
    convertBase64("aGVsbG8gYmFja2VuZA==", "decode"),
    "hello backend",
  );
});

test("rejects invalid Base64 input", () => {
  assert.throws(
    () => convertBase64("not valid!!!", "decode"),
    /Invalid Base64 input/,
  );
});
