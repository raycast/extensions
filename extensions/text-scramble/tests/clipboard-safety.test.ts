import assert from "node:assert/strict";
import test from "node:test";
import { canSafelyRestoreClipboard } from "../src/clipboard-safety";

test("accepts clipboard content Raycast can restore", () => {
  assert.equal(canSafelyRestoreClipboard({ text: "reference" }), true);
  assert.equal(canSafelyRestoreClipboard({ text: "reference", html: "<p>reference</p>" }), true);
  assert.equal(canSafelyRestoreClipboard({ text: "reference", file: "/tmp/reference.png" }), true);
});

test("rejects unsupported rich or empty clipboard representations", () => {
  assert.equal(canSafelyRestoreClipboard({ text: "" }), false);
});
