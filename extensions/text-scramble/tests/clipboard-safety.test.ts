import assert from "node:assert/strict";
import test from "node:test";
import { canSafelyRestoreClipboard, getRestorableClipboardContent } from "../src/clipboard-safety";

test("returns the exact payload Raycast can restore", () => {
  assert.equal(getRestorableClipboardContent({ text: "reference" }), "reference");
  assert.equal(getRestorableClipboardContent({ text: "" }), "");
  assert.deepEqual(getRestorableClipboardContent({ text: "reference", html: "<p>reference</p>" }), {
    html: "<p>reference</p>",
    text: "reference",
  });
});

test("accepts clipboard content Raycast can restore", () => {
  assert.equal(canSafelyRestoreClipboard({ text: "reference" }), true);
  assert.equal(canSafelyRestoreClipboard({ text: "" }), true);
  assert.equal(canSafelyRestoreClipboard({ text: "reference", html: "<p>reference</p>" }), true);
});

test("rejects unsupported clipboard representations", () => {
  assert.equal(getRestorableClipboardContent({}), null);
  assert.equal(getRestorableClipboardContent({ text: "reference", file: "/tmp/reference.png" }), null);
  assert.equal(canSafelyRestoreClipboard({}), false);
  assert.equal(canSafelyRestoreClipboard({ text: "reference", file: "/tmp/reference.png" }), false);
  assert.equal(
    canSafelyRestoreClipboard({ text: "reference", file: "/tmp/reference.png", html: "<p>reference</p>" }),
    false,
  );
});
