import { describe, expect, it } from "vitest";

import { formatAge, formatBytes, formatCommand, formatDuration } from "./format";

describe("format helpers", () => {
  it("formats sizes across units", () => {
    expect(formatBytes()).toBe("Size unavailable");
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(12 * 1024 * 1024)).toBe("12 MB");
  });

  it("formats age without returning negative time", () => {
    const now = new Date("2026-09-24T00:00:00Z");
    expect(formatAge(undefined, now)).toBeUndefined();
    expect(formatAge(now, now)).toBe("today");
    expect(formatAge(new Date("2026-09-23T00:00:00Z"), now)).toBe("1 day ago");
    expect(formatAge(new Date("2026-09-20T00:00:00Z"), now)).toBe("4 days ago");
    expect(formatAge(new Date("2026-09-25T00:00:00Z"), now)).toBe("today");
  });

  it("formats run durations", () => {
    expect(formatDuration("2026-09-24T00:00:00Z", "2026-09-24T00:00:03Z")).toBe("3s");
    expect(formatDuration("2026-09-24T00:00:00Z", "2026-09-24T00:01:12Z")).toBe("1m 12s");
    expect(formatDuration("2026-09-24T00:00:05Z", "2026-09-24T00:00:00Z")).toBe("0s");
    expect(formatDuration("invalid", "2026-09-24T00:00:00Z")).toBe("Unknown");
  });

  it("formats native commands", () => {
    expect(formatCommand({ executable: "brew", args: ["cleanup", "--prune=all"] })).toBe("brew cleanup --prune=all");
    expect(formatCommand({ executable: "pnpm", args: [] })).toBe("pnpm");
  });
});
