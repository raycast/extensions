import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, rmdir, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { withReminderLock } from "../src/lib/reminder-lock";

test("separate command processes respect the same storage lock", async () => {
  const directory = await mkdtemp(join(tmpdir(), "local-time-tracker-process-lock-"));
  const path = join(directory, "lock");
  const run = promisify(execFile);
  const script = `
    const { withReminderLock } = require(process.argv[2]);
    withReminderLock(process.argv[1], async () => console.log("acquired"))
      .catch(error => { console.error(error.message); process.exitCode = 1; });
  `;
  const args = ["--import", "tsx", "-e", script, path, resolve("src/lib/reminder-lock.ts")];
  try {
    await withReminderLock(path, async () => {
      await assert.rejects(run(process.execPath, args), /Another reminder operation/);
    });
    assert.match((await run(process.execPath, args)).stdout, /acquired/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

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

test("an old operation cannot release a replacement operation's lock", async () => {
  const directory = await mkdtemp(join(tmpdir(), "local-time-tracker-lock-"));
  const path = join(directory, "lock");
  let releaseOld!: () => void;
  let releaseNew!: () => void;
  let enteredOld!: () => void;
  let enteredNew!: () => void;
  const oldEntered = new Promise<void>((resolve) => {
    enteredOld = resolve;
  });
  const newEntered = new Promise<void>((resolve) => {
    enteredNew = resolve;
  });
  const oldHeld = new Promise<void>((resolve) => {
    releaseOld = resolve;
  });
  const newHeld = new Promise<void>((resolve) => {
    releaseNew = resolve;
  });
  try {
    const old = withReminderLock(path, async () => {
      enteredOld();
      await oldHeld;
    });
    await oldEntered;
    await rmdir(path);
    const replacement = withReminderLock(path, async () => {
      enteredNew();
      await newHeld;
    });
    await newEntered;
    releaseOld();
    await old;
    await assert.rejects(
      withReminderLock(path, async () => "third"),
      /Another reminder operation/,
    );
    releaseNew();
    await replacement;
    assert.equal(await withReminderLock(path, async () => "retry"), "retry");
  } finally {
    releaseOld?.();
    releaseNew?.();
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
