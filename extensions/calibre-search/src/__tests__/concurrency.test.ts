import { runConcurrently } from "../concurrency";

describe("runConcurrently", () => {
  it("starts no more than the requested number of tasks", () => {
    const started: number[] = [];
    const doneByItem = new Map<number, () => void>();

    runConcurrently([1, 2, 3], 2, (item, done) => {
      started.push(item);
      doneByItem.set(item, done);
      return () => {};
    });

    expect(started).toEqual([1, 2]);

    doneByItem.get(1)?.();

    expect(started).toEqual([1, 2, 3]);
  });

  it("cleans up running tasks and prevents queued tasks from starting", () => {
    const started: number[] = [];
    const cleanedUp: number[] = [];
    const doneByItem = new Map<number, () => void>();

    const cleanup = runConcurrently([1, 2, 3], 2, (item, done) => {
      started.push(item);
      doneByItem.set(item, done);
      return () => cleanedUp.push(item);
    });

    cleanup();
    doneByItem.get(1)?.();

    expect(started).toEqual([1, 2]);
    expect(cleanedUp).toEqual([1, 2]);
  });
});
