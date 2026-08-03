import { describe, expect, it } from "vitest";

import { parseTimeOnBatteryFromPmsetLog } from "../lib/power-battery-time";

describe("parseTimeOnBatteryFromPmsetLog", () => {
  it("measures from the start of the current battery stint, not the latest entry", () => {
    const log = [
      "2024-01-01 10:00:00 +0000 Assertions Summary- [System: kDisp] Using AC(Charge: 100)",
      "2024-01-01 12:00:00 +0000 Assertions Summary- [System: kDisp] Using Batt(Charge: 98)",
      "2024-01-01 13:00:00 +0000 Assertions Summary- [System: kDisp] Using Batt(Charge: 80)",
    ].join("\n");
    const now = new Date("2024-01-01T13:30:00.000Z");

    expect(parseTimeOnBatteryFromPmsetLog(log, now)).toBe("01:30:00");
  });

  it("returns N/A while on AC power", () => {
    const log = [
      "2024-01-01 09:00:00 +0000 Assertions Summary- [System: kDisp] Using Batt(Charge: 50)",
      "2024-01-01 10:00:00 +0000 Assertions Summary- [System: kDisp] Using AC(Charge: 51)",
    ].join("\n");

    expect(parseTimeOnBatteryFromPmsetLog(log)).toBe("N/A");
  });

  it("returns N/A when no battery events exist", () => {
    expect(parseTimeOnBatteryFromPmsetLog("no power lines here")).toBe("N/A");
  });

  it("returns N/A for unparseable timestamps", () => {
    expect(parseTimeOnBatteryFromPmsetLog("not-a-date Using Batt(Charge: 50)")).toBe("N/A");
  });
});
