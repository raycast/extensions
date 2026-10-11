import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { withReminderLock } from "../src/lib/reminder-lock";

test("concurrent reminder operations are blocked and a failed operation releases its lock", async () => {
  const directory = await mkdtemp(join(tmpdir(), "local-time-tracker-lock-"));
  const path = join(directory, "lock");
  try {
    await assert.rejects(
      withReminderLock(path, async () => {
        await assert.rejects(
          withReminderLock(path, async () => "overlap"),
          /Another reminder operation/,
        );
        throw new Error("delivery failed");
      }),
      /delivery failed/,
    );
    assert.equal(await withReminderLock(path, async () => "retry"), "retry");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a later check recovers locks left by terminated commands", async () => {
  const directory = await mkdtemp(join(tmpdir(), "local-time-tracker-lock-"));
  const path = join(directory, "lock");
  try {
    await mkdir(path);
    const old = new Date(Date.now() - 6 * 60000);
    await utimes(path, old, old);
    assert.equal(await withReminderLock(path, async () => "recovered"), "recovered");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
