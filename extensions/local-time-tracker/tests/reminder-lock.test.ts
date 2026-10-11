import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { execFile, spawn } from "node:child_process";
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

test("an old lock file cannot steal a live owner's OS lock", async () => {
  const directory = await mkdtemp(join(tmpdir(), "local-time-tracker-lock-"));
  const path = join(directory, "lock");
  try {
    await withReminderLock(path, async () => {
      const old = new Date(Date.now() - 6 * 60000);
      await utimes(`${path}.file`, old, old);
      await assert.rejects(
        withReminderLock(path, async () => "overlap"),
        /Another reminder operation/,
      );
    });
    assert.equal(await withReminderLock(path, async () => "retry"), "retry");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("simultaneous acquisition of an old unlocked file admits only one owner", async () => {
  const directory = await mkdtemp(join(tmpdir(), "local-time-tracker-lock-"));
  const path = join(directory, "lock");
  let release!: () => void;
  let entered!: () => void;
  let rejected!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const acquired = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const busy = new Promise<void>((resolve) => {
    rejected = resolve;
  });
  let owners = 0;
  try {
    await writeFile(`${path}.file`, "");
    const old = new Date(Date.now() - 6 * 60000);
    await utimes(`${path}.file`, old, old);
    const attempt = () =>
      withReminderLock(path, async () => {
        owners++;
        entered();
        await held;
      }).then(
        () => "acquired",
        (error: Error) => {
          assert.match(error.message, /Another reminder operation/);
          rejected();
          return "busy";
        },
      );
    const first = attempt();
    const second = attempt();
    await acquired;
    await busy;
    assert.equal(owners, 1);
    release();
    assert.deepEqual((await Promise.all([first, second])).sort(), ["acquired", "busy"]);
    assert.equal(await withReminderLock(path, async () => "retry"), "retry");
  } finally {
    release?.();
    await rm(directory, { recursive: true, force: true });
  }
});

test("terminating a command releases the lock without stale-directory recovery", async () => {
  const directory = await mkdtemp(join(tmpdir(), "local-time-tracker-lock-"));
  const path = join(directory, "lock");
  const script = `
    const { withReminderLock } = require(process.argv[2]);
    withReminderLock(process.argv[1], async () => {
      console.log("acquired");
      await new Promise(() => setInterval(() => {}, 1000));
    });
  `;
  const child = spawn(process.execPath, ["--import", "tsx", "-e", script, path, resolve("src/lib/reminder-lock.ts")]);
  const exited = new Promise<void>((resolve) => child.once("close", () => resolve()));
  try {
    await new Promise<void>((resolve, reject) => {
      child.stdout.on("data", () => resolve());
      child.once("error", reject);
      child.once("exit", () => reject(new Error("Command exited before acquiring its lock")));
    });
    await assert.rejects(
      withReminderLock(path, async () => "overlap"),
      /Another reminder operation/,
    );
    child.kill("SIGKILL");
    await exited;
    assert.equal(await withReminderLock(path, async () => "recovered"), "recovered");
  } finally {
    child.kill("SIGKILL");
    await exited;
    await rm(directory, { recursive: true, force: true });
  }
});
