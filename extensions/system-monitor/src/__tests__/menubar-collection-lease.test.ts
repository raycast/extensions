import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { acquireCollectionLease, withCollectionLease } from "../menubar/collection-lease";

const temporaryDirectories: string[] = [];

async function leasePath(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "system-monitor-lease-"));
  temporaryDirectories.push(directory);
  return path.join(directory, "collection.lock");
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("collection lease", () => {
  it("allows only one concurrent owner", async () => {
    const lockDirectory = await leasePath();
    const first = await acquireCollectionLease({ lockDirectory, ownerId: "first", now: () => 1_000 });
    const second = await acquireCollectionLease({ lockDirectory, ownerId: "second", now: () => 1_001 });

    expect(first.status).toBe("acquired");
    expect(second).toEqual({ status: "active", ageMs: 1 });

    if (first.status === "acquired") await first.release();
  });

  it("allows only one concurrent collector to run", async () => {
    const lockDirectory = await leasePath();
    let finishFirst: (() => void) | undefined;
    const firstCollector = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finishFirst = () => resolve("first");
        }),
    );
    const secondCollector = vi.fn(async () => "second");

    const first = withCollectionLease({ lockDirectory, ownerId: "first" }, firstCollector);
    while (!finishFirst) await new Promise((resolve) => setTimeout(resolve, 1));
    const second = await withCollectionLease({ lockDirectory, ownerId: "second" }, secondCollector);

    expect(second.status).toBe("active");
    expect(secondCollector).not.toHaveBeenCalled();
    finishFirst();
    await expect(first).resolves.toEqual({ status: "collected", value: "first" });
    expect(firstCollector).toHaveBeenCalledOnce();
  });

  it("recovers a stale owner without allowing the old owner to release the new lease", async () => {
    const lockDirectory = await leasePath();
    const first = await acquireCollectionLease({ lockDirectory, ownerId: "first", now: () => 1_000 });
    const second = await acquireCollectionLease({ lockDirectory, ownerId: "second", now: () => 21_001 });

    expect(second.status).toBe("acquired");
    if (first.status === "acquired") await first.release();

    const third = await acquireCollectionLease({ lockDirectory, ownerId: "third", now: () => 21_002 });
    expect(third.status).toBe("active");

    if (second.status === "acquired") await second.release();
  });

  it("allows only one winner when stale recovery is concurrent", async () => {
    const lockDirectory = await leasePath();
    const stale = await acquireCollectionLease({ lockDirectory, ownerId: "stale", now: () => 1_000 });

    const contenders = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        acquireCollectionLease({ lockDirectory, ownerId: `contender-${index}`, now: () => 21_001 }),
      ),
    );
    const winners = contenders.filter((lease) => lease.status === "acquired");

    expect(winners).toHaveLength(1);
    if (stale.status === "acquired") await stale.release();
    if (winners[0]?.status === "acquired") await winners[0].release();
  });

  it("recovers an abandoned recovery guard", async () => {
    const lockDirectory = await leasePath();
    const recoveryDirectory = `${lockDirectory}.recovery.lock`;
    await mkdir(recoveryDirectory);
    await writeFile(
      path.join(recoveryDirectory, "owner.json"),
      JSON.stringify({ ownerId: "stale", acquiredAt: 1_000 }),
    );

    const lease = await acquireCollectionLease({ lockDirectory, ownerId: "new", now: () => 21_001 });

    expect(lease.status).toBe("acquired");
    if (lease.status === "acquired") await lease.release();
  });

  it("releases after collector failure", async () => {
    const lockDirectory = await leasePath();

    await expect(
      withCollectionLease({ lockDirectory, ownerId: "failing", now: () => 1_000 }, async () => {
        throw new Error("collector failed");
      }),
    ).rejects.toThrow("collector failed");

    const retry = await acquireCollectionLease({ lockDirectory, ownerId: "retry", now: () => 1_001 });
    expect(retry.status).toBe("acquired");
    if (retry.status === "acquired") await retry.release();
  });
});
