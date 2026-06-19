import { describe, it, expect } from "vitest";
import {
  parseLaunchctlList,
  labelToDisplayName,
  decodeExitStatus,
  isDaemonPlistPath,
  parseScheduleFromPlist,
} from "./launchd";

describe("parseLaunchctlList", () => {
  it("parses a typical launchctl list output", () => {
    const out = `{
\t"StandardOutPath" = "/tmp/out.log";
\t"StandardErrorPath" = "/tmp/err.log";
\t"LastExitStatus" = 0;
\t"PID" = 1234;
\t"Program" = "/usr/local/bin/foo";
\t"Label" = "com.example.foo";
};`;
    const result = parseLaunchctlList(out, "com.example.foo");
    expect(result).toEqual({
      label: "com.example.foo",
      lastExitStatus: 0,
      pid: 1234,
      stdoutPath: "/tmp/out.log",
      stderrPath: "/tmp/err.log",
      program: "/usr/local/bin/foo",
      loaded: true,
    });
  });

  it("returns null lastExitStatus when the field is absent", () => {
    const out = `{
\t"Label" = "com.example.foo";
};`;
    const result = parseLaunchctlList(out, "com.example.foo");
    expect(result.lastExitStatus).toBeNull();
  });

  it("returns null pid when the field is absent", () => {
    const out = `{ "Label" = "com.example.foo"; };`;
    const result = parseLaunchctlList(out, "com.example.foo");
    expect(result.pid).toBeNull();
  });
});

describe("decodeExitStatus", () => {
  it("returns nulls when raw status is null", () => {
    expect(decodeExitStatus(null)).toEqual({ exitCode: null, signal: null });
  });

  it("decodes a normal exit (low 7 bits zero)", () => {
    // exit code 1 → raw = 1 << 8 = 256
    expect(decodeExitStatus(256)).toEqual({ exitCode: 1, signal: null });
  });

  it("decodes exit 0", () => {
    expect(decodeExitStatus(0)).toEqual({ exitCode: 0, signal: null });
  });

  it("decodes a signal kill (low 7 bits nonzero)", () => {
    // SIGKILL = 9
    expect(decodeExitStatus(9)).toEqual({ exitCode: null, signal: 9 });
  });
});

describe("labelToDisplayName", () => {
  it("uses the last segment of a long reverse-DNS label", () => {
    expect(labelToDisplayName("com.example.foo.bar")).toBe("Bar");
  });

  it("handles short two-segment labels gracefully", () => {
    expect(labelToDisplayName("org.foo")).toBe("Foo");
  });

  it("falls back to the raw label for single segments", () => {
    expect(labelToDisplayName("standalone")).toBe("Standalone");
  });

  it("splits hyphens into capitalized words", () => {
    expect(labelToDisplayName("com.example.my-cool-job")).toBe("My Cool Job");
  });

  it("splits underscores into capitalized words", () => {
    expect(labelToDisplayName("com.example.my_cool_job")).toBe("My Cool Job");
  });
});

describe("isDaemonPlistPath", () => {
  it("returns true for /Library/LaunchDaemons paths", () => {
    expect(
      isDaemonPlistPath("/Library/LaunchDaemons/com.example.foo.plist"),
    ).toBe(true);
  });

  it("returns false for user LaunchAgents", () => {
    expect(
      isDaemonPlistPath(
        "/Users/foo/Library/LaunchAgents/com.example.foo.plist",
      ),
    ).toBe(false);
  });

  it("returns false for system LaunchAgents", () => {
    expect(
      isDaemonPlistPath("/Library/LaunchAgents/com.example.foo.plist"),
    ).toBe(false);
  });

  it("returns false for null", () => {
    expect(isDaemonPlistPath(null)).toBe(false);
  });
});

describe("parseScheduleFromPlist", () => {
  it("returns a calendar schedule for StartCalendarInterval dict", () => {
    const plist = { StartCalendarInterval: { Hour: 9, Minute: 30 } };
    expect(parseScheduleFromPlist(plist)).toEqual([
      { type: "calendar", Hour: 9, Minute: 30 },
    ]);
  });

  it("returns multiple calendar schedules for an array", () => {
    const plist = {
      StartCalendarInterval: [{ Hour: 9 }, { Hour: 17 }],
    };
    expect(parseScheduleFromPlist(plist)).toEqual([
      { type: "calendar", Hour: 9 },
      { type: "calendar", Hour: 17 },
    ]);
  });

  it("returns an interval schedule for StartInterval", () => {
    const plist = { StartInterval: 300 };
    expect(parseScheduleFromPlist(plist)).toEqual([
      { type: "interval", seconds: 300 },
    ]);
  });

  it("combines StartInterval and StartCalendarInterval", () => {
    const plist = {
      StartInterval: 60,
      StartCalendarInterval: { Hour: 0 },
    };
    const schedules = parseScheduleFromPlist(plist);
    expect(schedules).toContainEqual({ type: "interval", seconds: 60 });
    expect(schedules).toContainEqual({ type: "calendar", Hour: 0 });
  });

  it("returns empty array when no scheduling keys are present", () => {
    expect(parseScheduleFromPlist({})).toEqual([]);
  });
});
