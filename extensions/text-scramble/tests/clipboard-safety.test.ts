import assert from "node:assert/strict";
import test from "node:test";
import {
  canSafelyRestoreClipboard,
  getRestorableClipboardContent,
  restoreClipboardWithRetry,
} from "../src/clipboard-safety";

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

test("retries transient clipboard restore failures", async () => {
  const attempts: string[] = [];
  const pauses: number[] = [];

  await restoreClipboardWithRetry(
    "reference",
    async (content) => {
      attempts.push(String(content));
      if (attempts.length < 3) throw new Error("pasteboard busy");
    },
    3,
    async (delayMs) => {
      pauses.push(delayMs);
    },
  );

  assert.deepEqual(attempts, ["reference", "reference", "reference"]);
  assert.deepEqual(pauses, [50, 100]);
});

test("surfaces a persistent clipboard restore failure", async () => {
  const failure = new Error("pasteboard unavailable");
  let attempts = 0;

  await assert.rejects(
    restoreClipboardWithRetry(
      "reference",
      async () => {
        attempts += 1;
        throw failure;
      },
      3,
      async () => undefined,
    ),
    failure,
  );
  assert.equal(attempts, 3);
});
