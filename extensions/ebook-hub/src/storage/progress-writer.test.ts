import { describe, expect, it, vi } from "vitest";

import { PROGRESS_SCHEMA_VERSION, type ReadingProgress } from "../domain/book";
import { ProgressWriter } from "./progress-writer";

const progress = (blockIndex: number): ReadingProgress => ({
  schemaVersion: PROGRESS_SCHEMA_VERSION,
  position: { chapterIndex: 0, blockIndex },
  percent: blockIndex,
  bookmarks: [],
  updatedAt: `2026-09-16T00:00:0${blockIndex}.000Z`,
});

function deferred() {
  let resolve: () => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<void>((resolveFn, rejectFn) => {
    resolve = resolveFn;
    reject = rejectFn;
  });
  return { promise, resolve, reject };
}

describe("ProgressWriter", () => {
  it("writes one snapshot at a time and keeps only the newest pending one", async () => {
    const first = deferred();
    const written: number[] = [];
    const write = vi.fn(async (value: ReadingProgress) => {
      written.push(value.position.blockIndex);
      if (written.length === 1) {
        await first.promise;
      }
    });
    const writer = new ProgressWriter(write);

    const running = writer.save(progress(1));
    expect(written).toEqual([1]);

    // Both arrive while the first write is still in flight; only the newest survives.
    await writer.save(progress(2));
    await writer.save(progress(3));
    expect(written).toEqual([1]);

    first.resolve();
    await running;

    expect(written).toEqual([1, 3]);
  });

  it("surfaces write failures and accepts later snapshots", async () => {
    const write = vi
      .fn<(progress: ReadingProgress) => Promise<void>>()
      .mockRejectedValueOnce(new Error("disk full"))
      .mockResolvedValue(undefined);
    const writer = new ProgressWriter(write);

    await expect(writer.save(progress(1))).rejects.toThrow("disk full");

    await writer.save(progress(2));
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("writes sequentially when calls do not overlap", async () => {
    const written: number[] = [];
    const writer = new ProgressWriter(async (value) => {
      written.push(value.position.blockIndex);
    });

    await writer.save(progress(1));
    await writer.save(progress(2));

    expect(written).toEqual([1, 2]);
  });
});
