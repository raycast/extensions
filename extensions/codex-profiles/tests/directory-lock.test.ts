import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { withDirectoryLock } from "../src/directory-lock.ts";

test("serializes concurrent operations on the same lock directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-profile-lock-"));
  const lockPath = join(root, "lock");
  const events: string[] = [];
  let releaseFirst!: () => void;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  try {
    const first = withDirectoryLock(lockPath, async () => {
      events.push("first-start");
      await firstGate;
      events.push("first-end");
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    const second = withDirectoryLock(
      lockPath,
      async () => {
        events.push("second-start");
      },
      { waitTimeoutMs: 1_000, retryDelayMs: 5 },
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(events, ["first-start"]);
    releaseFirst();
    await Promise.all([first, second]);
    assert.deepEqual(events, ["first-start", "first-end", "second-start"]);
  } finally {
    releaseFirst();
    await rm(root, { recursive: true, force: true });
  }
});

test("reclaims a lock only when its recorded owner process has exited", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-profile-lock-"));
  const lockPath = join(root, "lock");
  const abandonedOwnerPid = 2_147_483_647;

  try {
    await mkdir(lockPath);
    await writeFile(
      join(lockPath, `owner-${abandonedOwnerPid}-00000000-0000-0000-0000-000000000000`),
      String(abandonedOwnerPid),
    );
    let ran = false;
    await withDirectoryLock(lockPath, async () => {
      ran = true;
    });
    assert.equal(ran, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("does not expire an old lock owned by a live process", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-profile-lock-"));
  const lockPath = join(root, "lock");
  const marker = join(lockPath, `owner-${process.pid}-live`);

  try {
    await mkdir(lockPath);
    await writeFile(marker, String(process.pid));
    const old = new Date(Date.now() - 120_000);
    await utimes(marker, old, old);

    await assert.rejects(
      withDirectoryLock(lockPath, async () => undefined, { waitTimeoutMs: 20, retryDelayMs: 5 }),
      /Another profile operation is still in progress/,
    );
    await assert.doesNotReject(() => writeFile(marker, String(process.pid)));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
