import { describe, expect, it, vi } from "vitest";
import { createSingleFlight } from "../src/single-flight";

describe("createSingleFlight", () => {
  it("shares one active refresh and starts another only after it settles", async () => {
    let finish: ((value: number) => void) | undefined;
    const operation = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          finish = resolve;
        }),
    );
    const run = createSingleFlight(operation);

    const first = run();
    const overlapping = run();

    expect(operation).toHaveBeenCalledTimes(1);
    expect(overlapping).toBe(first);

    finish?.(1);
    await expect(first).resolves.toBe(1);

    const next = run();
    expect(operation).toHaveBeenCalledTimes(2);
    expect(next).not.toBe(first);
  });

  it("allows a retry after the active refresh rejects", async () => {
    const operation = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce("online");
    const run = createSingleFlight(operation);

    await expect(run()).rejects.toThrow("offline");
    await expect(run()).resolves.toBe("online");
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
