import { describe, expect, it, vi } from "vitest";
import {
  BUSY,
  REFRESH_WAIT_MS,
  claimInFlight,
  inFlightKey,
  inFlightLabel,
  runClaimed,
  subscribeInFlight,
} from "./inFlight";

describe("claimInFlight", () => {
  it("refuses a second claim on a key until the first is released", () => {
    const key = inFlightKey(false, "kitlangton/tap/ghui");
    const release = claimInFlight(key, "Installing ghui…");
    expect(release).toBeTypeOf("function");
    expect(claimInFlight(key, "Upgrading ghui…")).toBeUndefined();
    expect(inFlightLabel(key)).toBe("Installing ghui…");
    release!();
    expect(inFlightLabel(key)).toBeUndefined();
    const again = claimInFlight(key, "Upgrading ghui…");
    expect(again).toBeTypeOf("function");
    again!();
  });

  it("keys a formula and a cask of the same name apart, ignoring case", () => {
    expect(inFlightKey(false, "ghui")).not.toBe(inFlightKey(true, "ghui"));
    expect(inFlightKey(true, "Kitlangton/Tap/Scrawl")).toBe(inFlightKey(true, "kitlangton/tap/scrawl"));
  });

  it("ignores a second release, so it cannot free a newer claim", () => {
    const first = claimInFlight("k", "a");
    first!();
    const second = claimInFlight("k", "b");
    first!();
    expect(claimInFlight("k", "c")).toBeUndefined();
    second!();
  });

  it("tells subscribers on claim and on release, not on a refused claim", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeInFlight(listener);
    const release = claimInFlight("s", "a");
    expect(listener).toHaveBeenCalledTimes(1);
    claimInFlight("s", "b");
    expect(listener).toHaveBeenCalledTimes(1);
    release!();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});

describe("runClaimed", () => {
  it("holds the claim until the view's refresh resolves, then releases it", async () => {
    let finishRefresh!: () => void;
    const refresh = new Promise<void>((resolve) => (finishRefresh = resolve));
    const run = runClaimed(
      "r1",
      "Uninstalling tailcode…",
      async () => true,
      () => refresh,
    );
    await vi.waitFor(() => expect(inFlightLabel("r1")).toBe("Uninstalling tailcode…"));
    await Promise.resolve();
    expect(inFlightLabel("r1")).toBe("Uninstalling tailcode…");
    finishRefresh();
    expect(await run).toBe(true);
    expect(inFlightLabel("r1")).toBeUndefined();
  });

  it("passes the action's result to the refresh", async () => {
    const after = vi.fn();
    await runClaimed("r2", "x", async () => false, after);
    expect(after).toHaveBeenCalledWith(false);
  });

  it("returns BUSY without running anything while the key is claimed", async () => {
    const release = claimInFlight("r3", "Installing tailcode…");
    const fn = vi.fn(async () => true);
    expect(await runClaimed("r3", "Uninstalling tailcode…", fn)).toBe(BUSY);
    expect(fn).not.toHaveBeenCalled();
    release!();
  });

  it("releases the claim when the action throws", async () => {
    await expect(
      runClaimed("r4", "x", async () => {
        throw new Error("brew failed");
      }),
    ).rejects.toThrow("brew failed");
    expect(inFlightLabel("r4")).toBeUndefined();
  });

  it("stops waiting on a refresh that never settles after REFRESH_WAIT_MS", async () => {
    vi.useFakeTimers();
    try {
      const run = runClaimed(
        "r5",
        "x",
        async () => true,
        () => new Promise(() => undefined),
      );
      await vi.advanceTimersByTimeAsync(REFRESH_WAIT_MS - 1);
      expect(inFlightLabel("r5")).toBe("x");
      await vi.advanceTimersByTimeAsync(1);
      expect(await run).toBe(true);
      expect(inFlightLabel("r5")).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not let a rejected refresh fail the action", async () => {
    expect(
      await runClaimed(
        "r6",
        "x",
        async () => true,
        () => Promise.reject(new Error("read failed")),
      ),
    ).toBe(true);
    expect(inFlightLabel("r6")).toBeUndefined();
  });
});
