import { execFile, spawn } from "child_process";
import { once } from "events";
import { closeSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { expect, test } from "vitest";
import {
  acquireBrewLock,
  brewLockCommand,
  brewLockSupervisorCommand,
  isBrewOperationRunning,
  openBrewLock,
} from "../../homebrew/lock";
import { runProcessWithLifetime } from "../../homebrew/process-lifetime";
import { createSupportDirectory } from "../fixtures/support-directory";

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// Lifetime tests need an immediate observation during the TERM grace period;
// the user-facing status probe deliberately waits out transient contention.
async function isLockHeld(): Promise<boolean> {
  const command = brewLockCommand("/usr/bin/true", []);
  return new Promise((resolve, reject) => {
    execFile(command.file, command.args, (error) => {
      if (!error) resolve(false);
      else if (error.code === 75) resolve(true);
      else reject(error);
    });
  });
}

async function waitForLockState(expected: boolean, timeout = 1500): Promise<void> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if ((await isLockHeld()) === expected) return;
    await delay(50);
  }
  throw new Error(`Timed out waiting for lock state ${expected}`);
}

async function waitForFile(path: string, timeout = 2500): Promise<void> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (existsSync(path)) return;
    await delay(25);
  }
  throw new Error(`Timed out waiting for file ${path}`);
}

// The Homebrew lock file, open for this test. `using` closes it, which releases any lock it holds.
function openLock() {
  const fd = openBrewLock();
  return { fd, [Symbol.dispose]: () => closeSync(fd) };
}

// A process that holds the Homebrew lock until `await using` ends it.
async function spawnLockOwner() {
  const command = brewLockCommand(process.execPath, ["-e", 'process.stdout.write("ready"); process.stdin.resume();']);
  const owner = spawn(command.file, command.args);
  const closed = once(owner, "close");
  await once(owner.stdout, "data");
  return {
    [Symbol.asyncDispose]: async () => {
      owner.stdin.end();
      await closed;
    },
  };
}

async function runSupervisor(file: string, args: string[], timeout: number) {
  using lock = openLock();
  await acquireBrewLock(lock.fd);
  const command = brewLockSupervisorCommand(file, args);
  return await runProcessWithLifetime(command.file, command.args, { timeout, lockFileDescriptor: lock.fd });
}

// These workflows use macOS lockf and must retain real OS locking.

test.skipIf(process.platform !== "darwin")(
  "reports idle for concurrent status checks when no installation is running",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    // When
    const results = await Promise.all(Array.from({ length: 12 }, () => isBrewOperationRunning()));
    // Then
    expect(results).toEqual(Array(12).fill(false));
  },
);

test.skipIf(process.platform !== "darwin")("keeps an acquired fd lock until its owner closes the fd", async () => {
  // Given
  using supportDirectory = createSupportDirectory();
  {
    using lock = openLock();
    await acquireBrewLock(lock.fd);
    // When
    const results = await Promise.all(Array.from({ length: 4 }, () => isBrewOperationRunning()));
    // Then
    expect(results).toEqual(Array(4).fill(true));
  }
  // When
  const result = await isBrewOperationRunning();
  // Then
  expect(result).toBe(false);
});

test.skipIf(process.platform !== "darwin")(
  "blocks other processes and releases automatically after the owner exits",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    {
      await using owner = await spawnLockOwner();
      // When
      const result = await isBrewOperationRunning();
      // Then
      expect(result).toBe(true);
      // When
      const other = brewLockCommand(process.execPath, ["-e", 'process.stdout.write("started");']);
      const attempt = await new Promise<{ code: string | number | null | undefined; stdout: string }>((resolve) => {
        execFile(other.file, other.args, (error, stdout) => resolve({ code: error?.code, stdout }));
      });
      // Then
      expect(attempt).toEqual({ code: 75, stdout: "" });
    }
    // When
    const result = await isBrewOperationRunning();
    // Then
    expect(result).toBe(false);
  },
);

test.skipIf(process.platform !== "darwin")(
  "keeps the lock during timeout escalation and kills a TERM-ignoring process group",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    const ready = join(supportDirectory.path, "timeout-ready");
    const marker = join(supportDirectory.path, "timeout-marker");
    const workerScript =
      'trap ":" TERM; /usr/bin/touch "$1"; ( /bin/sleep 5; /usr/bin/touch "$2" ) & while :; do /bin/sleep 1; done';
    const timeout = 3000;
    // When
    const startedAt = Date.now();
    let settled = false;
    const operation = runSupervisor("/bin/bash", ["-c", workerScript, "marker-worker", ready, marker], timeout).finally(
      () => {
        settled = true;
      },
    );
    try {
      await waitForFile(ready);
      await delay(Math.max(0, timeout - (Date.now() - startedAt)) + 100);
      // Then
      expect(await isLockHeld()).toBe(true);
      expect(settled).toBe(false);
      const result = await operation;
      expect(result.timedOut).toBe(true);
      expect(result.exitCode).not.toBe(0);
      // When
      const locked = await isBrewOperationRunning();
      // Then
      expect(locked).toBe(false);
      // When
      await delay(1200);
      const result2 = existsSync(marker);
      // Then
      expect(result2).toBe(false);
    } finally {
      await operation;
    }
  },
  12000,
);

test.skipIf(process.platform !== "darwin")(
  "releases the lock only after an ordinary supervisor completion",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    const ready = join(supportDirectory.path, "completion-ready");
    const release = join(supportDirectory.path, "completion-release");
    // When
    const operation = runSupervisor(
      "/bin/bash",
      [
        "-c",
        '/usr/bin/touch "$1"; while [ ! -f "$2" ]; do /bin/sleep .05; done; printf ready',
        "worker",
        ready,
        release,
      ],
      4000,
    );
    try {
      await waitForFile(ready);
      // Then
      expect(await isLockHeld()).toBe(true);
    } finally {
      writeFileSync(release, "");
      await operation;
    }
    const result = await operation;
    // Then
    expect(result).toMatchObject({ exitCode: 0, signal: null, timedOut: false });
    expect(result.stdout).toBe("ready");
    // When
    const locked = await isBrewOperationRunning();
    // Then
    expect(locked).toBe(false);
  },
);

test.skipIf(process.platform !== "darwin")(
  "keeps ownership after the originating process is killed",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    const lockPath = join(supportDirectory.path, "cli-install.lock");
    const marker = join(supportDirectory.path, "parent-death-marker");
    const ready = join(supportDirectory.path, "parent-death-ready");
    const command = brewLockSupervisorCommand("/bin/bash", [
      "-c",
      'trap ":" TERM; /usr/bin/touch "$1"; ( /bin/sleep 5; /usr/bin/touch "$2" ) & printf READY; while :; do /bin/sleep 1; done',
      "marker-worker",
      ready,
      marker,
    ]);
    const launcherSource = [
      'const { spawn } = require("child_process");',
      'const { openSync } = require("fs");',
      `const lockFileDescriptor = openSync(${JSON.stringify(lockPath)}, "a+");`,
      `const lock = spawn("/usr/bin/lockf", ["-s", "-t", "0", "3"], { stdio: ["ignore", "ignore", "ignore", lockFileDescriptor] });`,
      `lock.on("close", (code) => { if (code !== 0) process.exit(2); const supervisor = spawn(${JSON.stringify(command.file)}, ${JSON.stringify(command.args)}, { detached: true, stdio: ["pipe", "pipe", "ignore", lockFileDescriptor] }); supervisor.stdout.on("data", (chunk) => { if (chunk.toString().includes("READY")) process.kill(process.pid, "SIGKILL"); }); setTimeout(() => process.kill(process.pid, "SIGKILL"), 3000); });`,
    ].join("\n");
    // When
    const launcher = spawn(process.execPath, ["-e", launcherSource], { stdio: "ignore" });
    const launcherClosed = once(launcher, "close");
    try {
      const [exitCode, signal] = (await launcherClosed) as [number | null, NodeJS.Signals | null];
      // Then
      expect(exitCode).toBeNull();
      expect(signal).toBe("SIGKILL");
      // When
      await waitForFile(ready);
      await waitForLockState(true);
      await delay(250);
      // Then
      expect(await isLockHeld()).toBe(true);
      // When
      await waitForLockState(false, 4000);
      await delay(1200);
      const result = existsSync(marker);
      // Then
      expect(result).toBe(false);
    } finally {
      if (launcher.exitCode === null && launcher.signalCode === null) launcher.kill("SIGKILL");
      await launcherClosed;
      await waitForLockState(false, 4000);
    }
  },
  12000,
);
