import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { withFileLock } from "../src/history-lock";

test("serializes concurrent operations across the same file lock", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ai-quick-chat-lock-"));
  const target = path.join(directory, "history-mutations");
  let activeOperations = 0;
  let maximumActiveOperations = 0;

  const operation = async () => {
    await withFileLock(target, async () => {
      activeOperations += 1;
      maximumActiveOperations = Math.max(maximumActiveOperations, activeOperations);
      await delay(40);
      activeOperations -= 1;
    });
  };

  try {
    await Promise.all([operation(), operation(), operation()]);
    assert.equal(maximumActiveOperations, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
