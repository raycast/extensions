import { describe, expect, it } from "vitest";
import {
  classifyNightWatchStatus,
  isAuthorizationCanceled,
  parseSleepDisabled,
  statusMessage,
} from "../src/status";

describe("parseSleepDisabled", () => {
  it("detects an enabled system-wide setting", () => {
    expect(parseSleepDisabled("System-wide power settings:\n SleepDisabled\t\t1\n")).toBe(true);
  });

  it("detects a disabled system-wide setting", () => {
    expect(parseSleepDisabled("System-wide power settings:\n SleepDisabled\t\t0\n")).toBe(false);
  });

  it("does not confuse unrelated values with SleepDisabled", () => {
    expect(parseSleepDisabled(" sleep 1 (sleep prevented by powerd)\n")).toBe(false);
  });
});

describe("statusMessage", () => {
  it("provides a message for every lifecycle state", () => {
    for (const kind of ["off", "starting", "on-owned", "stopping", "on-external"] as const) {
      expect(statusMessage(kind)).not.toHaveLength(0);
    }
  });
});

describe("isAuthorizationCanceled", () => {
  it("recognizes macOS cancellation responses without treating other failures as cancellation", () => {
    expect(isAuthorizationCanceled("execution error: User canceled. (-128)")).toBe(true);
    expect(isAuthorizationCanceled("用户取消了授权 (-128)")).toBe(true);
    expect(isAuthorizationCanceled("pmset exited with status 1")).toBe(false);
  });
});

describe("classifyNightWatchStatus", () => {
  const base = {
    sleepDisabled: false,
    statePresent: false,
    processMatches: false,
    ready: false,
    stopped: false,
    stopRequested: false,
  };

  it("treats pmset as authoritative without an owned session", () => {
    expect(classifyNightWatchStatus(base)).toBe("off");
    expect(
      classifyNightWatchStatus({ ...base, sleepDisabled: true }),
    ).toBe("on-external");
  });

  it("recognizes an owned running session", () => {
    expect(
      classifyNightWatchStatus({
        ...base,
        sleepDisabled: true,
        statePresent: true,
        processMatches: true,
        ready: true,
        phase: "running",
      }),
    ).toBe("on-owned");
  });

  it("recognizes starting and stopping transitions", () => {
    expect(
      classifyNightWatchStatus({
        ...base,
        statePresent: true,
        processMatches: true,
        phase: "starting",
      }),
    ).toBe("starting");
    expect(
      classifyNightWatchStatus({
        ...base,
        sleepDisabled: true,
        statePresent: true,
        processMatches: true,
        ready: true,
        stopRequested: true,
        phase: "stopping",
      }),
    ).toBe("stopping");
  });

  it("keeps a stopping session visible until pmset confirms normal sleep", () => {
    expect(
      classifyNightWatchStatus({
        ...base,
        sleepDisabled: true,
        statePresent: true,
        processMatches: true,
        ready: true,
        phase: "stopping",
      }),
    ).toBe("stopping");
  });

  it("does not claim ownership before the privileged guard is ready", () => {
    expect(
      classifyNightWatchStatus({
        ...base,
        sleepDisabled: true,
        statePresent: true,
        processMatches: true,
        ready: false,
        phase: "starting",
      }),
    ).toBe("starting");
  });

  it("does not trust a stale PID or stale cache", () => {
    expect(
      classifyNightWatchStatus({
        ...base,
        sleepDisabled: true,
        statePresent: true,
        ready: true,
        phase: "running",
      }),
    ).toBe("on-external");
    expect(
      classifyNightWatchStatus({
        ...base,
        statePresent: true,
        ready: true,
        phase: "running",
      }),
    ).toBe("off");
  });
});
