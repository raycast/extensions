import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOLD_GAP_MS, HoldOptions, UPDATE_INTERVAL_MS, UpdateScheduler } from "./update-scheduler";

const KEY_REPEAT_MS = 30;

describe("UpdateScheduler", () => {
  let rendered: number[];
  let scheduler: UpdateScheduler<number>;
  const add = (delta: number) => (value: number) => value + delta;
  // Boundary every 10 steps, like crossing into a new month.
  const hold: HoldOptions<number> = {
    key: "down",
    isBoundary: (shown, next) => Math.floor(shown / 10) !== Math.floor(next / 10),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    rendered = [];
    scheduler = new UpdateScheduler(0, (value) => rendered.push(value));
  });

  afterEach(() => {
    scheduler.dispose();
    vi.useRealTimers();
  });

  it("renders a single change right away", () => {
    scheduler.update(add(1), hold);
    expect(rendered).toEqual([1]);
  });

  it("renders separate presses right away", () => {
    for (let i = 0; i < 3; i++) {
      scheduler.update(add(1), hold);
      vi.advanceTimersByTime(250);
    }
    expect(rendered).toEqual([1, 2, 3]);
  });

  it("renders only at boundaries while a key is held, then the final value", () => {
    for (let i = 0; i < 25; i++) {
      scheduler.update(add(1), hold);
      vi.advanceTimersByTime(KEY_REPEAT_MS);
    }
    // First press, the crossings into 10 and 20, then nothing until release.
    expect(rendered).toEqual([1, 10, 20]);
    vi.advanceTimersByTime(HOLD_GAP_MS);
    expect(rendered).toEqual([1, 10, 20, 25]);
  });

  it("throttles bursts that are not a hold", () => {
    for (let i = 0; i < 10; i++) {
      scheduler.update(add(1));
      vi.advanceTimersByTime(KEY_REPEAT_MS);
    }
    vi.advanceTimersByTime(UPDATE_INTERVAL_MS);
    expect(rendered.length).toBeLessThanOrEqual(Math.ceil((10 * KEY_REPEAT_MS) / UPDATE_INTERVAL_MS) + 1);
    expect(rendered.at(-1)).toBe(10);
  });

  it("settles pending moves when a selection is confirmed", () => {
    for (let i = 0; i < 5; i++) {
      scheduler.update(add(1), hold);
      vi.advanceTimersByTime(KEY_REPEAT_MS);
    }
    // The hold has only drawn the first press so far.
    expect(rendered).toEqual([1]);
    expect(scheduler.settle()).toBe(5);
    expect(rendered).toEqual([1, 5]);
    // Nothing is left to draw once the key is released.
    vi.advanceTimersByTime(HOLD_GAP_MS);
    expect(rendered).toEqual([1, 5]);
  });

  it("does not treat alternating keys as a hold", () => {
    scheduler.update(add(1), hold);
    vi.advanceTimersByTime(KEY_REPEAT_MS);
    scheduler.update(add(1), { ...hold, key: "right" });
    vi.advanceTimersByTime(UPDATE_INTERVAL_MS);
    expect(rendered).toEqual([1, 2]);
  });
});
