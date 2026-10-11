import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TimerState } from "./timer";

let stored: TimerState | null = null;
vi.mock("./store", () => ({
  loadState: vi.fn(async () => stored),
  saveState: vi.fn(async (s: TimerState) => {
    stored = s;
  }),
  clearState: vi.fn(async () => {
    stored = null;
  }),
}));
const notify = vi.fn(async () => {});
vi.mock("./notify", () => ({ notify: (...args: unknown[]) => notify(...(args as [])) }));
const playSound = vi.fn(async () => {});
vi.mock("./sound", () => ({ playSound: (...args: unknown[]) => playSound(...(args as [])) }));

import { pauseTimer, resumeTimer, settleExpired, startTimer } from "./actions";

beforeEach(() => {
  stored = null;
  notify.mockClear();
  playSound.mockClear();
  vi.useRealTimers();
});

describe("settleExpired", () => {
  it("does nothing while the timer is still running", async () => {
    vi.useFakeTimers({ now: 1_000_000 });
    await startTimer("focus", 60_000);
    vi.setSystemTime(1_030_000);
    const state = await settleExpired();
    expect(state?.status).toBe("running");
    expect(notify).not.toHaveBeenCalled();
    expect(playSound).toHaveBeenCalledTimes(1); // only the toggle from start
  });

  it("notifies and plays done exactly once after expiry", async () => {
    vi.useFakeTimers({ now: 1_000_000 });
    await startTimer("break", 60_000);
    vi.setSystemTime(1_060_000);
    const first = await settleExpired();
    const second = await settleExpired();
    expect(first?.status).toBe("finished");
    expect(second?.status).toBe("finished");
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith("Break finished", "Back to focus.");
    expect(playSound).toHaveBeenCalledWith("done");
    expect(playSound.mock.calls.filter(([s]) => s === "done")).toHaveLength(1);
  });
});

describe("pause/resume sounds", () => {
  it("plays toggle only when the state actually changes", async () => {
    expect(await pauseTimer()).toBeNull();
    expect(await resumeTimer()).toBeNull();
    expect(playSound).not.toHaveBeenCalled();

    await startTimer("focus", 60_000);
    await pauseTimer();
    await resumeTimer();
    expect(playSound.mock.calls.map(([s]) => s)).toEqual(["toggle", "toggle", "toggle"]);
  });
});
