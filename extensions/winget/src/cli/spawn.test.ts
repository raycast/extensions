import { describe, expect, it } from "vitest";

import { withQuerySlot } from "./spawn";

/** Flush enough microtasks for a woken queue waiter to re-enter the loop. */
async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

describe("withQuerySlot", () => {
  it("runs up to three queries concurrently and queues the rest", async () => {
    let active = 0;
    let peak = 0;
    const gates: Array<() => void> = [];

    const task = () =>
      withQuerySlot(async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise<void>((resolve) => gates.push(resolve));
        active--;
      });

    const runs = [task(), task(), task(), task(), task()];
    await settle();

    // Only three slots — the other two tasks must be waiting.
    expect(gates.length).toBe(3);
    expect(active).toBe(3);

    gates.shift()!();
    await settle();
    expect(gates.length).toBe(3);
    expect(active).toBe(3);

    while (gates.length > 0) {
      gates.shift()!();
      await settle();
    }
    await Promise.all(runs);

    expect(peak).toBe(3);
    expect(active).toBe(0);
  });

  it("releases the slot when the query throws", async () => {
    await expect(
      withQuerySlot(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    // All slots must be free again: three new tasks enter immediately.
    let entered = 0;
    const gates: Array<() => void> = [];
    const runs = [0, 1, 2].map(() =>
      withQuerySlot(async () => {
        entered++;
        await new Promise<void>((resolve) => gates.push(resolve));
      }),
    );
    await settle();
    expect(entered).toBe(3);
    for (const gate of gates) gate();
    await Promise.all(runs);
  });
});
