import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { lstat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withFileLock } from "../src/file-lock.ts";
import { getLevelSegments } from "../src/level.ts";

const workerIndex = process.argv.indexOf("--worker");
const holderIndex = process.argv.indexOf("--holder");

if (workerIndex >= 0) {
  const statePath = process.argv[workerIndex + 1];
  const lockPath = process.argv[workerIndex + 2];
  await withFileLock(
    lockPath,
    async () => {
      const value = Number.parseInt(await readFile(statePath, "utf8"), 10);
      await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 15)));
      await writeFile(statePath, `${value + 1}\n`, "utf8");
    },
    {
      retryMilliseconds: 5,
      timeoutMilliseconds: 5_000,
    },
  );
  process.exit(0);
}

if (holderIndex >= 0) {
  const lockPath = process.argv[holderIndex + 1];
  const holdMilliseconds = Number.parseInt(process.argv[holderIndex + 2], 10);
  const readyPath = process.argv[holderIndex + 3];
  await withFileLock(
    lockPath,
    async () => {
      await writeFile(readyPath, "ready\n", "utf8");
      await new Promise((resolve) => setTimeout(resolve, holdMilliseconds));
    },
    {
      retryMilliseconds: 5,
      timeoutMilliseconds: 1_000,
    },
  );
  process.exit(0);
}

const testDirectory = await mkdtemp(path.join(os.tmpdir(), "dimmer-file-lock-"));
const statePath = path.join(testDirectory, "state.txt");
const lockPath = path.join(testDirectory, "state.lock");
const scriptPath = fileURLToPath(import.meta.url);

try {
  assert.deepEqual(
    [0, 10, 40, 50, 90, 100].map(getLevelSegments),
    [0, 1, 4, 6, 10, 10],
  );

  await writeFile(statePath, "0\n", "utf8");

  const workers = Array.from({ length: 20 }, () => runWorker(scriptPath, statePath, lockPath));
  await Promise.all(workers);
  assert.equal(Number.parseInt(await readFile(statePath, "utf8"), 10), workers.length);

  const liveHolder = runHolder(scriptPath, lockPath, 250, path.join(testDirectory, "live-holder.ready"));
  await waitForPath(liveHolder.readyPath);
  await assert.rejects(
    withFileLock(lockPath, async () => assert.fail("A live lock must not be stolen"), {
      retryMilliseconds: 5,
      timeoutMilliseconds: 50,
    }),
    /Timed out while waiting for a file lock/,
  );
  await liveHolder.exited;

  const crashedHolder = runHolder(scriptPath, lockPath, 10_000, path.join(testDirectory, "crashed-holder.ready"));
  await waitForPath(crashedHolder.readyPath);
  crashedHolder.child.kill("SIGKILL");
  await crashedHolder.exited;

  await writeFile(statePath, "0\n", "utf8");
  const crashRecoveryWorkers = Array.from({ length: 20 }, () => runWorker(scriptPath, statePath, lockPath));
  await Promise.all(crashRecoveryWorkers);
  assert.equal(Number.parseInt(await readFile(statePath, "utf8"), 10), crashRecoveryWorkers.length);

  let sameProcessOperations = 0;
  let maximumSameProcessOperations = 0;
  const sameProcessWorkers = Array.from({ length: 10 }, () =>
    withFileLock(
      lockPath,
      async () => {
        sameProcessOperations += 1;
        maximumSameProcessOperations = Math.max(maximumSameProcessOperations, sameProcessOperations);
        await new Promise((resolve) => setTimeout(resolve, 5));
        sameProcessOperations -= 1;
      },
      { retryMilliseconds: 5, timeoutMilliseconds: 1_000 },
    ),
  );
  await Promise.all(sameProcessWorkers);
  assert.equal(maximumSameProcessOperations, 1);

  console.log(
    "HUD mapping, cross-process serialization, live-lock protection, concurrent crash recovery, and same-process serialization checks passed",
  );
} finally {
  await rm(testDirectory, { recursive: true, force: true });
}

function runHolder(script, lock, holdMilliseconds, readyPath) {
  const child = spawn(
    process.execPath,
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      "--experimental-strip-types",
      script,
      "--holder",
      lock,
      String(holdMilliseconds),
      readyPath,
    ],
    { stdio: "inherit" },
  );
  const exited = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0 || signal === "SIGKILL") {
        resolve();
      } else {
        reject(new Error(`Lock holder exited with code ${code} and signal ${signal}`));
      }
    });
  });
  return { child, exited, readyPath };
}

async function waitForPath(targetPath) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      await lstat(targetPath);
      return;
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
  throw new Error(`Timed out waiting for ${targetPath}`);
}

function runWorker(script, state, lock) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--experimental-strip-types", script, "--worker", state, lock], {
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Lock worker exited with code ${code}`));
      }
    });
  });
}
