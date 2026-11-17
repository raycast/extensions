import { mkdtemp, mkdir, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withAuthStorageLock } from "./auth-lock";

describe("auth storage lock", () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "jumpseat-lock-"));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("runs critical sections one at a time and releases the lock", async () => {
    const events: string[] = [];
    const section = (name: string) =>
      withAuthStorageLock(directory, async () => {
        events.push(`${name}:start`);
        await new Promise((resolve) => setTimeout(resolve, 30));
        events.push(`${name}:end`);
        return name;
      });

    await expect(Promise.all([section("a"), section("b")])).resolves.toEqual([
      "a",
      "b",
    ]);
    // Either may win the lock, but one must finish before the other starts.
    expect([
      ["a:start", "a:end", "b:start", "b:end"],
      ["b:start", "b:end", "a:start", "a:end"],
    ]).toContainEqual(events);
    await expect(
      withAuthStorageLock(directory, async () => "again"),
    ).resolves.toBe("again");
  });

  it("releases the lock when the critical section throws", async () => {
    await expect(
      withAuthStorageLock(directory, async () => {
        throw new Error("failed");
      }),
    ).rejects.toThrow("failed");
    await expect(withAuthStorageLock(directory, async () => 1)).resolves.toBe(
      1,
    );
  });

  it("takes over a lock left behind by a process that died", async () => {
    const stale = join(directory, "auth-storage.lock");
    await mkdir(stale);
    const longAgo = new Date(Date.now() - 60_000);
    await utimes(stale, longAgo, longAgo);

    await expect(
      withAuthStorageLock(directory, async () => "ok"),
    ).resolves.toBe("ok");
  });

  it("lets only one of several contenders take over a stale lock", async () => {
    const stale = join(directory, "auth-storage.lock");
    await mkdir(stale);
    const longAgo = new Date(Date.now() - 60_000);
    await utimes(stale, longAgo, longAgo);

    let active = 0;
    let maxActive = 0;
    await Promise.all(
      Array.from({ length: 6 }, () =>
        withAuthStorageLock(directory, async () => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          await new Promise((resolve) => setTimeout(resolve, 15));
          active -= 1;
        }),
      ),
    );

    expect(maxActive).toBe(1);
  });

  it("never removes a lock it no longer owns", async () => {
    const lock = join(directory, "auth-storage.lock");
    await withAuthStorageLock(directory, async () => {
      // Simulate another process having taken the lock over meanwhile.
      await writeFile(join(lock, "owner"), "another-process");
    });

    await expect(stat(lock)).resolves.toBeDefined();
  });
});
