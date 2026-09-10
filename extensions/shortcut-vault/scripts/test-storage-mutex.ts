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

    // 6. Aged, incomplete lock recovery (lockDir exists without pid.txt)
    fs.mkdirSync(lockDir, { recursive: true });
    const pastTime = new Date(Date.now() - 30000);
    fs.utimesSync(lockDir, pastTime, pastTime);
    assert.ok(!fs.existsSync(path.join(lockDir, "pid.txt")), "pid.txt should not exist");

    const incompleteRecovered = await mutex.runExclusive(async () => "incomplete-recovered");
    assert.equal(incompleteRecovered, "incomplete-recovered");
    assert.ok(!fs.existsSync(lockDir), "Aged incomplete lock should be cleaned up");

    // 7. Concurrent contenders recover stale lock safely
    fs.mkdirSync(lockDir, { recursive: true });
    fs.writeFileSync(path.join(lockDir, "pid.txt"), `999999999:${Date.now() - 30000}`);

    const contender1 = new CrossProcessMutex(lockDir, 3000);
    const contender2 = new CrossProcessMutex(lockDir, 3000);

    const [r1, r2] = await Promise.all([
      contender1.runExclusive(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return "c1";
      }),
      contender2.runExclusive(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return "c2";
      }),
    ]);

    assert.ok((r1 === "c1" && r2 === "c2") || (r1 === "c2" && r2 === "c1"));
    assert.ok(!fs.existsSync(lockDir), "Lock should be released after both contenders finish");

    // 8. Atomic heartbeat publishing never leaves pid.txt empty
    const longRunningMutex = new CrossProcessMutex(lockDir, 2000);
    let readEmptyPid = false;

    await longRunningMutex.runExclusive(async () => {
      const checkEnd = Date.now() + 300;
      while (Date.now() < checkEnd) {
        try {
          const content = fs.readFileSync(path.join(lockDir, "pid.txt"), "utf8");
          if (content.trim().length === 0) {
            readEmptyPid = true;
          }
        } catch {
          // File may be checked during transition
        }
        await new Promise((r) => setTimeout(r, 10));
      }
    });

    assert.equal(readEmptyPid, false, "Heartbeat updates must never expose an empty pid.txt");

    // 9. Stale lock recovery is safe against replacement race (interleaving probe)
    // Setup an initial stale lock with a dead PID
    fs.mkdirSync(lockDir, { recursive: true });
    fs.writeFileSync(path.join(lockDir, "pid.txt"), `999999999:${Date.now() - 30000}`);

    let probeExecuted = false;
    let raceContender2HoldingLock = false;
    let releaseRaceContender2: (() => void) | undefined;
    const raceContender2HoldPromise = new Promise<void>((resolve) => {
      releaseRaceContender2 = resolve;
    });

    const raceContender2 = new CrossProcessMutex(lockDir, 2000);
    let raceContender2TaskPromise: Promise<string> | undefined;

    // Contender 1 inspects the stale lock. Right between the stale check and the reclaim,
    // the interleaving probe inserts Contender 2's recovery and lock acquisition.
    const raceContender1 = new CrossProcessMutex(lockDir, {
      acquireTimeoutMs: 4000,
      onBeforeReclaimForTesting: async () => {
        if (!probeExecuted) {
          probeExecuted = true;
          raceContender2TaskPromise = raceContender2.runExclusive(async () => {
            raceContender2HoldingLock = true;
            await raceContender2HoldPromise;
            return "c2-success";
          });

          // Wait until raceContender2 has recovered the stale lock and is actively holding its new lock
          while (!raceContender2HoldingLock) {
            await new Promise((r) => setTimeout(r, 10));
          }

          // At this point, contender 2 is actively holding the lock in its critical section.
          // When contender 1 attempts tryReclaimStaleLockDir(), it must NOT rename or delete
          // contender 2's active lock directory.
          setTimeout(() => {
            // After contender 1 attempts reclaim and fails, release contender 2
            assert.ok(fs.existsSync(lockDir), "Contender 2's lock directory must remain intact");
            assert.ok(
              fs.readFileSync(path.join(lockDir, "pid.txt"), "utf8").startsWith(`${process.pid}:`),
              "Contender 2's lock file must remain intact",
            );
            releaseRaceContender2?.();
          }, 150);
        }
      },
    });

    const raceContender1Result = await raceContender1.runExclusive(async () => "c1-success");
    const raceContender2Result = await raceContender2TaskPromise;

    assert.ok(probeExecuted, "Interleaving probe should have executed");
    assert.equal(raceContender2Result, "c2-success");
    assert.equal(raceContender1Result, "c1-success");
    assert.ok(!fs.existsSync(lockDir), "Lock should be released cleanly after both contenders finish");

    // 10. Aged incomplete lock recovery is safe against replacement race
    fs.mkdirSync(lockDir, { recursive: true });
    const pastTime2 = new Date(Date.now() - 30000);
    fs.utimesSync(lockDir, pastTime2, pastTime2);

    let incompleteProbeExecuted = false;
    let raceContender4HoldingLock = false;
    let releaseRaceContender4: (() => void) | undefined;
    const raceContender4HoldPromise = new Promise<void>((resolve) => {
      releaseRaceContender4 = resolve;
    });

    const raceContender4 = new CrossProcessMutex(lockDir, 2000);
    let raceContender4TaskPromise: Promise<string> | undefined;

    const raceContender3 = new CrossProcessMutex(lockDir, {
      acquireTimeoutMs: 4000,
      onBeforeReclaimForTesting: async () => {
        if (!incompleteProbeExecuted) {
          incompleteProbeExecuted = true;
          raceContender4TaskPromise = raceContender4.runExclusive(async () => {
            raceContender4HoldingLock = true;
            await raceContender4HoldPromise;
            return "c4-success";
          });

          while (!raceContender4HoldingLock) {
            await new Promise((r) => setTimeout(r, 10));
          }

          setTimeout(() => {
            assert.ok(fs.existsSync(lockDir), "Contender 4's lock directory must remain intact");
            assert.ok(fs.existsSync(path.join(lockDir, "pid.txt")), "Contender 4's lock file must remain intact");
            releaseRaceContender4?.();
          }, 150);
        }
      },
    });

    const raceContender3Result = await raceContender3.runExclusive(async () => "c3-success");
    const raceContender4Result = await raceContender4TaskPromise;

    assert.ok(incompleteProbeExecuted, "Incomplete lock interleaving probe should have executed");
    assert.equal(raceContender4Result, "c4-success");
    assert.equal(raceContender3Result, "c3-success");
    assert.ok(!fs.existsSync(lockDir), "Lock should be released cleanly after both contenders finish");

    console.log("storage mutex tests passed");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

void run();
