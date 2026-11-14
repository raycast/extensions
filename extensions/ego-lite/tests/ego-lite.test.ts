import assert from "node:assert/strict";
import test from "node:test";

import { normalizeWebUrl } from "../src/lib/browser-safety";

test("accepts only HTTP and HTTPS URLs", () => {
  assert.equal(normalizeWebUrl("https://raycast.com"), "https://raycast.com/");
  assert.throws(() => normalizeWebUrl("javascript:alert(1)"), /HTTP or HTTPS/);
});

test("rejects malformed URLs", () => {
  assert.throws(() => normalizeWebUrl("not a url"), /Invalid URL/);
});
