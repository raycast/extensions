import { describe, expect, it, vi } from "vitest";
import type { WorkItemSummary } from "../src/api/types";
import { arrayMutator, OPTIMISTIC_ONLY, sendWorkItemUpdate } from "../src/helpers/work-item-updates";

const item = { id: "w1", name: "Fix login", priority: "low" } as WorkItemSummary;

describe("sendWorkItemUpdate", () => {
  it("applies the optimistic change and reloads exactly once", async () => {
    const reload = vi.fn();
    const mutate = vi.fn(async (_id: string, request: Promise<unknown>) => request);
    await sendWorkItemUpdate({
      workItemId: "w1",
      request: Promise.resolve(),
      change: { priority: "high" },
      mutate,
      reload,
    });
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("reloads once without a mutator", async () => {
    const reload = vi.fn();
    await sendWorkItemUpdate({ workItemId: "w1", request: Promise.resolve(), change: {}, reload });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("throws and does not reload when the request fails", async () => {
    const reload = vi.fn();
    const mutate = vi.fn(async (_id: string, request: Promise<unknown>) => request);
    await expect(
      sendWorkItemUpdate({ workItemId: "w1", request: Promise.reject(new Error("403")), change: {}, mutate, reload }),
    ).rejects.toThrow("403");
    expect(reload).not.toHaveBeenCalled();
  });
});

describe("arrayMutator", () => {
  it("updates the row optimistically without a reload of its own", async () => {
    const mutate = vi.fn(async () => undefined);
    await arrayMutator(mutate)("w1", Promise.resolve(), { priority: "high" });
    const [, options] = mutate.mock.calls[0] as unknown as [
      Promise<unknown>,
      { shouldRevalidateAfter?: boolean; optimisticUpdate: (data: WorkItemSummary[]) => WorkItemSummary[] },
    ];
    expect(options.shouldRevalidateAfter).toBe(OPTIMISTIC_ONLY.shouldRevalidateAfter);
    expect(options.shouldRevalidateAfter).toBe(false);
    expect(options.optimisticUpdate([item])[0].priority).toBe("high");
  });
});
