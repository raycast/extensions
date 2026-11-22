import { describe, expect, it } from "vitest";
import { runBatched } from "@/core/projects/run-batched";

/** 让出一次事件循环，模拟异步任务。 */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("runBatched", () => {
  it("每个元素都跑一次，顺序按数组顺序开始", async () => {
    const seen: number[] = [];
    await runBatched([1, 2, 3, 4, 5], async (item) => void seen.push(item), {
      concurrency: 2,
      isCancelled: () => false,
    });
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it("同时跑的数量不超过 concurrency", async () => {
    let running = 0;
    let peak = 0;
    await runBatched(
      [1, 2, 3, 4, 5, 6],
      async () => {
        running++;
        peak = Math.max(peak, running);
        await tick();
        running--;
      },
      { concurrency: 2, isCancelled: () => false },
    );
    expect(peak).toBe(2);
  });

  it("取消后不再开始新的任务", async () => {
    const seen: number[] = [];
    let cancelled = false;
    await runBatched(
      [1, 2, 3, 4, 5],
      async (item) => {
        seen.push(item);
        if (item === 2) cancelled = true;
      },
      { concurrency: 1, isCancelled: () => cancelled },
    );
    expect(seen).toEqual([1, 2]);
  });

  it("任务本身是同步的，也能在定时器里作废，剩下的不再读", async () => {
    const seen: number[] = [];
    let cancelled = false;
    // 真实时序：作废发生在另一个宏任务里，不是读取过程中同步改的。
    setTimeout(() => {
      cancelled = true;
    }, 0);

    // 数量要够多：定时器最早 1ms 才触发，项目太少会在触发前就读完。
    const items = Array.from({ length: 10000 }, (_, i) => i);
    await runBatched(items, async (item) => void seen.push(item), {
      concurrency: 3,
      isCancelled: () => cancelled,
    });

    expect(cancelled).toBe(true);
    expect(seen.length).toBeLessThan(items.length);
    // 读到的是开头连续的一段，没有跳着读。
    expect(seen).toEqual(items.slice(0, seen.length));
  });

  it("一开始就取消时一个都不跑", async () => {
    const seen: number[] = [];
    await runBatched([1, 2, 3], async (item) => void seen.push(item), {
      concurrency: 2,
      isCancelled: () => true,
    });
    expect(seen).toEqual([]);
  });

  it("空数组直接返回", async () => {
    await expect(runBatched([], async () => {}, { concurrency: 3, isCancelled: () => false })).resolves.toBeUndefined();
  });

  it("concurrency 大于元素数时不会多跑", async () => {
    let calls = 0;
    await runBatched([1, 2], async () => void calls++, { concurrency: 10, isCancelled: () => false });
    expect(calls).toBe(2);
  });
});
