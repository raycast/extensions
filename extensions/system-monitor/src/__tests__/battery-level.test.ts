import { describe, expect, it } from "vitest";

import { batteryDisplayPercent, parseBatteryLevelPercent } from "../lib/battery-level";

describe("battery level parsing", () => {
  it("parses numeric battery levels", () => {
    expect(parseBatteryLevelPercent("80")).toBe(80);
    expect(parseBatteryLevelPercent("100")).toBe(100);
    expect(parseBatteryLevelPercent("N/A")).toBeNull();
    expect(parseBatteryLevelPercent(undefined)).toBeNull();
  });

  it("flips the percentage for the used display mode", () => {
    expect(batteryDisplayPercent("80", "free")).toBe(80);
    expect(batteryDisplayPercent("80", "used")).toBe(20);
    expect(batteryDisplayPercent("N/A", "used")).toBeNull();
  });
});
