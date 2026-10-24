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
    // Write an old timestamp (>3s ago) with an impossible PID (999999999)
    const oldTimestamp = Date.now() - 30000;
    fs.writeFileSync(path.join(lockDir, "pid.txt"), `999999999:${oldTimestamp}`);

    const recoveredResult = await mutex.runExclusive(async () => "recovered");
    assert.equal(recoveredResult, "recovered");
    assert.ok(!fs.existsSync(lockDir), "Stale lock should have been broken and cleaned up");

    // 4b. Stale lock recovery for SAME process PID (e.g. worker thread crash in Raycast Node process)
    fs.mkdirSync(lockDir, { recursive: true });
    const oldSamePidTimestamp = Date.now() - 30000;
    fs.writeFileSync(path.join(lockDir, "pid.txt"), `${process.pid}:${oldSamePidTimestamp}:crashed-token`);

    const samePidRecovered = await mutex.runExclusive(async () => "same-pid-recovered");
    assert.equal(samePidRecovered, "same-pid-recovered");
    assert.ok(!fs.existsSync(lockDir), "Stale lock with same PID should have been broken and cleaned up");

    // 4c. Token ownership prevents mismatched release from removing active lock
    fs.mkdirSync(lockDir, { recursive: true });
    fs.writeFileSync(path.join(lockDir, "pid.txt"), `${process.pid}:${Date.now()}:active-token`);
    await (mutex as unknown as { releaseIfOwned: (token: string) => Promise<void> }).releaseIfOwned("mismatched-token");
    assert.ok(fs.existsSync(lockDir), "Lock should not be removed when token does not match");
    assert.ok(fs.existsSync(path.join(lockDir, "pid.txt")), "pid.txt should remain when token does not match");
    fs.rmSync(lockDir, { recursive: true, force: true });

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

    // 9. Stale lock recovery is safe against replacement race occurring after snapshot check but before renameSync
    // Setup an initial stale lock with a dead PID
    fs.mkdirSync(lockDir, { recursive: true });
    fs.writeFileSync(path.join(lockDir, "pid.txt"), `999999999:${Date.now() - 30000}`);

    let probeExecuted = false;
    let contender3Blocked = false;

    // Contender 1 inspects the stale lock, passes isSnapshotMatch(), and triggers onBeforeRenameForTesting
    // right before renameSync(). The interleaving probe replaces the stale lock with Contender 2's live lock.
    const raceContender1 = new CrossProcessMutex(lockDir, {
      acquireTimeoutMs: 3000,
      onBeforeRenameForTesting: async () => {
        if (!probeExecuted) {
          probeExecuted = true;
          // Contender 2 replaces the stale lock with a live lock
          fs.rmSync(lockDir, { recursive: true, force: true });
          fs.mkdirSync(lockDir);
          fs.writeFileSync(path.join(lockDir, "pid.txt"), `${process.pid}:${Date.now()}`);
        }
      },
    });

    // Start contender 1 recovery
    const contender1Promise = raceContender1.runExclusive(async () => "c1-after-restore");

    // Wait until probe executes
    while (!probeExecuted) {
      await new Promise((r) => setTimeout(r, 10));
    }

    // Attempt concurrent acquisition by Contender 3 while the live lock is in transition
    const contender3InTransition = new CrossProcessMutex(lockDir, 100);
    try {
      await contender3InTransition.runExclusive(async () => "c3-success");
    } catch {
      contender3Blocked = true;
    }

    assert.ok(probeExecuted, "Interleaving probe must have executed");
    assert.ok(contender3Blocked, "Another command must be blocked while lock is in transition / restoration");

    // Contender 2's live lock must be restored and intact at lockDir
    assert.ok(fs.existsSync(lockDir), "Contender 2's lock directory must be restored to lockDir");
    assert.ok(
      fs.readFileSync(path.join(lockDir, "pid.txt"), "utf8").startsWith(`${process.pid}:`),
      "Contender 2's lock file must remain intact",
    );

    // Contender 2 now finishes its task and releases its lock
    fs.rmSync(lockDir, { recursive: true, force: true });

    // Contender 1 can now acquire cleanly
    const c1Result = await contender1Promise;
    assert.equal(c1Result, "c1-after-restore");
    assert.ok(!fs.existsSync(lockDir), "Lock should be cleanly released at the end");

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

    // 11. A paused/stale command whose lock was reclaimed cannot overwrite or remove the replacement lock
    const pausedMutex = new CrossProcessMutex(lockDir, 2000);
    const replacementMutex = new CrossProcessMutex(lockDir, 2000);

    let pausedTaskStarted = false;
    let resumePausedTask: (() => void) | undefined;
    const pausedHoldPromise = new Promise<void>((resolve) => {
      resumePausedTask = resolve;
    });

    const pausedPromise = pausedMutex.runExclusive(async () => {
      pausedTaskStarted = true;
      await pausedHoldPromise;
      return "paused-finished";
    });

    while (!pausedTaskStarted) {
      await new Promise((r) => setTimeout(r, 10));
    }

    // Age the lock file timestamp to simulate being paused past STALE_THRESHOLD_MS
    const staleTime = Date.now() - 30000;
    const currentPidContent = fs.readFileSync(path.join(lockDir, "pid.txt"), "utf8");
    const currentToken = currentPidContent.split(":")[2];
    fs.writeFileSync(path.join(lockDir, "pid.txt"), `${process.pid}:${staleTime}:${currentToken}`);

    // Command 2 detects stale lock, breaks it, and acquires a replacement lock
    const replacementResult = await replacementMutex.runExclusive(async () => {
      assert.ok(fs.existsSync(lockDir), "Replacement lock directory must exist");
      return "replacement-success";
    });
    assert.equal(replacementResult, "replacement-success");

    // Command 3 acquires and holds an active replacement lock
    const liveLockMutex = new CrossProcessMutex(lockDir, 2000);
    let liveLockHolding = false;
    let releaseLiveLock: (() => void) | undefined;
    const liveHoldPromise = new Promise<void>((resolve) => {
      releaseLiveLock = resolve;
    });

    const livePromise = liveLockMutex.runExclusive(async () => {
      liveLockHolding = true;
      await liveHoldPromise;
      return "live-success";
    });

    while (!liveLockHolding) {
      await new Promise((r) => setTimeout(r, 10));
    }

    const liveToken = fs.readFileSync(path.join(lockDir, "pid.txt"), "utf8").split(":")[2];

    // Command 1 unpauses and completes its task
    resumePausedTask?.();
    await assert.rejects(
      pausedPromise,
      /Cross-process storage lock was lost/,
      "Paused command must detect lock loss and reject",
    );

    // Verify Command 3's live replacement lock was NOT removed or overwritten by Command 1
    assert.ok(fs.existsSync(lockDir), "Live replacement lock directory must remain intact");
    const postPidContent = fs.readFileSync(path.join(lockDir, "pid.txt"), "utf8");
    assert.equal(postPidContent.split(":")[2], liveToken, "Live replacement lock token must not be overwritten");

    // Release Command 3's lock
    releaseLiveLock?.();
    assert.equal(await livePromise, "live-success");
    assert.ok(!fs.existsSync(lockDir), "Lock should be released cleanly after live command finishes");

    // 12. Pausing after creating lock directory but before writing pid.txt allows another command
    // to reclaim the directory, and prevents the paused command from running its task concurrently
    let pauseBeforeWriteTriggered = false;
    let resumePausedContender: (() => void) | undefined;
    const pauseBeforeWritePromise = new Promise<void>((resolve) => {
      resumePausedContender = resolve;
    });

    const contenderPausedBeforeWrite = new CrossProcessMutex(lockDir, {
      acquireTimeoutMs: 1500,
      onBeforeWriteLockContentForTesting: async () => {
        pauseBeforeWriteTriggered = true;
        await pauseBeforeWritePromise;
      },
    });

    let contenderPausedTaskRan = false;
    const contenderPausedPromise = contenderPausedBeforeWrite.runExclusive(async () => {
      contenderPausedTaskRan = true;
      return "paused-should-not-run";
    });

    // Wait until Contender 1 created the lock directory and paused before writing pid.txt
    while (!pauseBeforeWriteTriggered) {
      await new Promise((r) => setTimeout(r, 10));
    }
    assert.ok(fs.existsSync(lockDir), "Lock directory must exist before writing pid.txt");
    assert.ok(!fs.existsSync(path.join(lockDir, "pid.txt")), "pid.txt must not exist yet");

    // Age the incomplete lock directory past STALE_THRESHOLD_MS (>6s)
    const agedTime = new Date(Date.now() - 30000);
    fs.utimesSync(lockDir, agedTime, agedTime);

    // Command 2 starts, sees aged incomplete directory, reclaims it, and acquires its own lock
    const liveHolder = new CrossProcessMutex(lockDir, 2000);
    let liveHolderHolding = false;
    let releaseLiveHolder: (() => void) | undefined;
    const liveHolderPromise = new Promise<void>((resolve) => {
      releaseLiveHolder = resolve;
    });

    const liveTaskPromise = liveHolder.runExclusive(async () => {
      liveHolderHolding = true;
      await liveHolderPromise;
      return "live-holder-done";
    });

    while (!liveHolderHolding) {
      await new Promise((r) => setTimeout(r, 10));
    }

    assert.ok(fs.existsSync(path.join(lockDir, "pid.txt")), "Live holder must have written its pid.txt");
    const liveHolderToken = fs.readFileSync(path.join(lockDir, "pid.txt"), "utf8").split(":")[2];

    // Wait past contenderPausedBeforeWrite's acquireTimeoutMs (1500ms)
    await new Promise((r) => setTimeout(r, 1600));

    // Now resume Contender 1
    resumePausedContender?.();

    // Contender 1 must reject and its task must NEVER have run
    await assert.rejects(
      contenderPausedPromise,
      /Could not acquire cross-process storage lock/,
      "Paused contender whose lock directory was reclaimed must reject",
    );
    assert.equal(contenderPausedTaskRan, false, "Paused contender's task must never have executed");

    // Verify live holder's lock was untouched
    assert.ok(fs.existsSync(lockDir), "Live holder's lock directory must remain intact");
    const postReclaimToken = fs.readFileSync(path.join(lockDir, "pid.txt"), "utf8").split(":")[2];
    assert.equal(postReclaimToken, liveHolderToken, "Live holder's token must not be overwritten");

    // Finish live holder
    releaseLiveHolder?.();
    assert.equal(await liveTaskPromise, "live-holder-done");
    assert.ok(!fs.existsSync(lockDir), "Lock should be released cleanly after live holder finishes");

    // 13. A failed heartbeat write while the lock is still owned does not mark the lock as lost or strand the lock
    let heartbeatWriteAttempted = false;
    const failingHeartbeatMutex = new CrossProcessMutex(lockDir, {
      acquireTimeoutMs: 2000,
      onBeforeHeartbeatWriteForTesting: () => {
        heartbeatWriteAttempted = true;
        throw new Error("simulated transient heartbeat write error");
      },
    });

    let failingHeartbeatTaskRan = false;
    const failingHeartbeatResult = await failingHeartbeatMutex.runExclusive(async () => {
      failingHeartbeatTaskRan = true;
      // Wait long enough for the heartbeat (1000ms interval) to fire at least once
      await new Promise((r) => setTimeout(r, 1200));
      return "heartbeat-test-success";
    });

    assert.equal(heartbeatWriteAttempted, true, "Heartbeat write must have been attempted and failed");
    assert.equal(failingHeartbeatTaskRan, true, "Task must have executed");
    assert.equal(failingHeartbeatResult, "heartbeat-test-success", "Task must report success even if heartbeat write threw");
    assert.ok(!fs.existsSync(lockDir), "Owned lock must be cleanly released when task ends and not stranded");

    // 14. If lock ownership is actually lost during operation, lock is marked as lost and command rejects
    let lostLockTaskStarted = false;
    let resumeLostLockTask: (() => void) | undefined;
    const lostLockPromise = new Promise<void>((resolve) => {
      resumeLostLockTask = resolve;
    });

    const lostLockMutex = new CrossProcessMutex(lockDir, 2000);
    const lostTaskPromise = lostLockMutex.runExclusive(async () => {
      lostLockTaskStarted = true;
      await lostLockPromise;
      return "should-not-succeed";
    });

    while (!lostLockTaskStarted) {
      await new Promise((r) => setTimeout(r, 10));
    }

    // Simulate lock directory being reclaimed / replaced by another contender
    fs.rmSync(lockDir, { recursive: true, force: true });
    fs.mkdirSync(lockDir);
    fs.writeFileSync(path.join(lockDir, "pid.txt"), `999999999:${Date.now()}:other-token`);

    // Let heartbeat detect that ownership is lost
    await new Promise((r) => setTimeout(r, 1100));
    resumeLostLockTask?.();

    await assert.rejects(
      lostTaskPromise,
      /Cross-process storage lock was lost/,
      "Command must reject when lock ownership is actually lost",
    );

    // Verify other contender's lock was not removed by the first command
    assert.ok(fs.existsSync(lockDir), "Other contender's lock directory must not be removed");
    assert.ok(
      fs.readFileSync(path.join(lockDir, "pid.txt"), "utf8").includes("other-token"),
      "Other contender's lock file must remain intact",
    );
    fs.rmSync(lockDir, { recursive: true, force: true });

    console.log("storage mutex tests passed");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

void run();
