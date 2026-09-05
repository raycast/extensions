import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CrossProcessMutex } from "../src/lib/cross-process-mutex";

async function run() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mutex-test-"));
  const lockDir = path.join(tmpDir, "test.lock");

  try {
    // 1. Basic acquire & release
    const mutex = new CrossProcessMutex(lockDir, 2000);
    let taskRan = false;

    const result = await mutex.runExclusive(async () => {
      taskRan = true;
      assert.ok(fs.existsSync(lockDir), "Lock directory should exist during task");
      assert.ok(fs.existsSync(path.join(lockDir, "pid.txt")), "pid.txt should exist during task");
      return 42;
    });

    assert.equal(result, 42);
    assert.ok(taskRan, "Task should have executed");
    assert.ok(!fs.existsSync(lockDir), "Lock directory should be removed after release");

    // 2. Error in task still releases lock
    await assert.rejects(
      mutex.runExclusive(async () => {
        throw new Error("task failed");
      }),
      /task failed/,
    );
    assert.ok(!fs.existsSync(lockDir), "Lock should be released even when task throws");

    // 3. Sequential operations work after release
    const secondResult = await mutex.runExclusive(async () => "success");
    assert.equal(secondResult, "success");
    assert.ok(!fs.existsSync(lockDir), "Lock should be released after second run");

    // 4. Stale lock recovery for non-existent PID
    fs.mkdirSync(lockDir, { recursive: true });
    // Write an old timestamp (>15s ago) with an impossible PID (999999999)
    const oldTimestamp = Date.now() - 30000;
    fs.writeFileSync(path.join(lockDir, "pid.txt"), `999999999:${oldTimestamp}`);

    const recoveredResult = await mutex.runExclusive(async () => "recovered");
    assert.equal(recoveredResult, "recovered");
    assert.ok(!fs.existsSync(lockDir), "Stale lock should have been broken and cleaned up");

    // 5. Short timeout fails when lock cannot be acquired
    const shortMutex = new CrossProcessMutex(lockDir, 200);
    // Create an active (fresh) lock by our current PID
    fs.mkdirSync(lockDir, { recursive: true });
    fs.writeFileSync(path.join(lockDir, "pid.txt"), `${process.pid}:${Date.now()}`);

    // Another mutex trying to acquire should time out because PID is alive and timestamp is fresh
    await assert.rejects(
      shortMutex.runExclusive(async () => "should not run"),
      /Could not acquire cross-process storage lock/,
    );

    // Clean up our manual lock
    if (fs.existsSync(path.join(lockDir, "pid.txt"))) fs.unlinkSync(path.join(lockDir, "pid.txt"));
    if (fs.existsSync(lockDir)) fs.rmdirSync(lockDir);

    console.log("storage mutex tests passed");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

void run();
