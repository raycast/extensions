import { describe, expect, it } from "vitest";

import { formatBatteryLevelDisplay, formatBatteryLevelValue, parseBatteryLevelPercent } from "../lib/battery-level";

describe("battery level formatting", () => {
  it("parses numeric battery levels", () => {
    expect(parseBatteryLevelPercent("82")).toBe(82);
    expect(parseBatteryLevelPercent("N/A")).toBeNull();
    expect(parseBatteryLevelPercent(undefined)).toBeNull();
  });

  it("formats free and used display modes", () => {
    expect(formatBatteryLevelDisplay("80", "free")).toBe("80 %");
    expect(formatBatteryLevelDisplay("80", "used")).toBe("20 %");
    expect(formatBatteryLevelDisplay("N/A", "used")).toBe("N/A");
  });

  it("formats menubar values without percent suffix", () => {
    expect(formatBatteryLevelValue("80", "free")).toBe("80");
    expect(formatBatteryLevelValue("80", "used")).toBe("20");
    expect(formatBatteryLevelValue("N/A", "used")).toBe("N/A");
  });
});
