import { describe, it, expect, vi } from "vitest";

// @raycast/api is a runtime-only package and can't be resolved in Vitest;
// stub the bits status.ts touches.
vi.mock("@raycast/api", () => ({
  Icon: new Proxy({}, { get: (_t, key) => key }),
}));

import { getOverallStatus, getMenuBarTitle, getStatusText } from "./status";
import { JobStatus } from "../api/types";

const baseJob: JobStatus = {
  label: "com.example.foo",
  displayName: "Foo",
  loaded: true,
  running: false,
  pid: null,
  lastExitCode: 0,
  signal: null,
  success: true,
  lastRunTime: null,
  nextRunTime: null,
  scheduleDescription: null,
  stdoutPath: null,
  stderrPath: null,
  program: null,
  plistPath: null,
};
const ok = (over: Partial<JobStatus> = {}): JobStatus => ({
  ...baseJob,
  ...over,
});
const failing = ok({ success: false, lastExitCode: 1 });
const notLoaded = ok({ loaded: false, success: null, lastExitCode: null });
const running = ok({ running: true, pid: 4321, success: null });
const neverRun = ok({ success: null, lastExitCode: null });

describe("getOverallStatus", () => {
  it("returns all-ok when every job is healthy", () => {
    expect(getOverallStatus([ok(), ok()])).toBe("all-ok");
  });

  it("prioritizes failures over everything else", () => {
    expect(getOverallStatus([failing, notLoaded, running])).toBe(
      "has-failures",
    );
  });

  it("surfaces running jobs above not-loaded", () => {
    expect(getOverallStatus([running, notLoaded])).toBe("has-running");
  });

  it("surfaces running jobs above all-ok", () => {
    expect(getOverallStatus([running, ok()])).toBe("has-running");
  });

  it("returns not-loaded when only unloaded jobs are present", () => {
    expect(getOverallStatus([ok(), notLoaded])).toBe("not-loaded");
  });
});

describe("getMenuBarTitle", () => {
  it("returns undefined when everything is healthy", () => {
    expect(getMenuBarTitle([ok(), ok()])).toBeUndefined();
  });

  it("shows failure count alone", () => {
    expect(getMenuBarTitle([failing, ok()])).toBe("1 failed");
  });

  it("shows unloaded count alone", () => {
    expect(getMenuBarTitle([notLoaded, ok()])).toBe("1 unloaded");
  });

  it("combines failures and unloaded counts", () => {
    expect(getMenuBarTitle([failing, notLoaded])).toBe("1 failed, 1 unloaded");
  });
});

describe("getStatusText", () => {
  it("returns 'Not Loaded' for unloaded jobs", () => {
    expect(getStatusText(notLoaded)).toBe("Not Loaded");
  });

  it("returns 'Running' when a PID is present", () => {
    expect(getStatusText(running)).toBe("Running");
  });

  it("returns 'Never Run' when there's no exit info", () => {
    expect(getStatusText(neverRun)).toBe("Never Run");
  });

  it("returns 'OK' for successful jobs", () => {
    expect(getStatusText(ok())).toBe("OK");
  });

  it("returns 'Failed (exit N)' for nonzero exits", () => {
    expect(getStatusText(failing)).toBe("Failed (exit 1)");
  });

  it("returns 'Killed (signal N)' for signal kills", () => {
    expect(
      getStatusText(ok({ success: false, lastExitCode: null, signal: 9 })),
    ).toBe("Killed (signal 9)");
  });
});
