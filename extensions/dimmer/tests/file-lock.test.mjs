import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withFileLock } from "../src/file-lock.ts";
import { getLevelSegments } from "../src/level.ts";

const workerIndex = process.argv.indexOf("--worker");

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
      staleMilliseconds: 2_000,
      timeoutMilliseconds: 5_000,
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

  await writeFile(lockPath, "stale\n", "utf8");
  const staleDate = new Date(Date.now() - 5_000);
  await utimes(lockPath, staleDate, staleDate);
  await withFileLock(lockPath, async () => writeFile(statePath, "recovered\n", "utf8"), {
    retryMilliseconds: 5,
    staleMilliseconds: 2_000,
    timeoutMilliseconds: 1_000,
  });
  assert.equal(await readFile(statePath, "utf8"), "recovered\n");

  console.log("HUD mapping, cross-process serialization, and stale-lock recovery checks passed");
} finally {
  await rm(testDirectory, { recursive: true, force: true });
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
