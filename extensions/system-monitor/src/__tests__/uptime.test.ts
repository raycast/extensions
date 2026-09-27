import { describe, expect, it } from "vitest";

import { formatUptime } from "../lib/uptime";

describe("uptime formatting", () => {
  it("formats minutes, hours, and days", () => {
    expect(formatUptime(59)).toBe("0m");
    expect(formatUptime(90 * 60)).toBe("1h 30m");
    expect(formatUptime((3 * 24 + 4) * 60 * 60)).toBe("3d 4h");
  });
});
