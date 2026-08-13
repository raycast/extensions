import { describe, expect, it, vi } from "vitest";
import {
  createSingleFlight,
  shouldToggleFromMenuBar,
} from "../src/menu-bar-click";

describe("menu-bar launch single flight", () => {
  it("shares one operation across repeated React effect mounts", async () => {
    const runOnce = createSingleFlight<number>();
    let calls = 0;
    const operation = async () => {
      calls += 1;
      return 42;
    };

    const [first, second] = await Promise.all([
      runOnce(operation),
      runOnce(operation),
    ]);

    expect(first).toBe(42);
    expect(second).toBe(42);
    expect(calls).toBe(1);
  });

  it("allows a later menu-bar click after the dedupe window", async () => {
    vi.useFakeTimers();
    const runOnce = createSingleFlight<number>();
    let calls = 0;
    const operation = async () => {
      calls += 1;
      return calls;
    };

    try {
      expect(await runOnce(operation)).toBe(1);
      expect(await runOnce(operation)).toBe(1);
      await vi.advanceTimersByTimeAsync(1_000);
      expect(await runOnce(operation)).toBe(2);
      expect(calls).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("direct menu-bar toggle", () => {
  it("toggles normal states on a user click", () => {
    expect(shouldToggleFromMenuBar("userInitiated", true, "off")).toBe(true);
    expect(shouldToggleFromMenuBar("userInitiated", true, "on-owned")).toBe(
      true,
    );
  });

  it("does not toggle during first activation or background refresh", () => {
    expect(shouldToggleFromMenuBar("userInitiated", false, "off")).toBe(false);
    expect(shouldToggleFromMenuBar("background", true, "off")).toBe(false);
  });

  it("keeps exceptional states behind the recovery menu", () => {
    expect(
      shouldToggleFromMenuBar("userInitiated", true, "on-external"),
    ).toBe(false);
    expect(shouldToggleFromMenuBar("userInitiated", true, "starting")).toBe(
      false,
    );
    expect(shouldToggleFromMenuBar("userInitiated", true, "stopping")).toBe(
      false,
    );
  });
});
