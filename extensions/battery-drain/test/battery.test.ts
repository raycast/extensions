import { describe, expect, it } from "vitest";
import { chargeState, chargingExplanation, chargingLabel, healthPercent } from "../src/analysis/battery";
import { nowBatteryParts } from "../src/render/summary";

describe("nowBatteryParts", () => {
  it("shows the percentage macOS shows (pmset), not ioreg's, which can differ right after unplugging", () => {
    // Real Intel capture: ioreg 720 of 4038 mAh = 18%, pmset (and the macOS menu bar) 14%.
    expect(nowBatteryParts({ percent: 18 }, { source: "battery", percent: 14 })?.percent).toBe("14%");
  });

  it("on battery without an estimate shows no words at all", () => {
    expect(nowBatteryParts({ percent: 46 }, { source: "battery", percent: 46 })).toEqual({
      pluggedIn: false,
      percent: "46%",
      status: undefined,
    });
  });

  it("on battery with an estimate shows the time left next to a clock", () => {
    expect(nowBatteryParts({ percent: 42 }, { source: "battery", percent: 42, minutesRemaining: 216 })).toEqual({
      pluggedIn: false,
      percent: "42%",
      status: { state: "on-battery", text: "3h 36m" },
    });
  });

  it("on AC shows the state as an icon only", () => {
    expect(
      nowBatteryParts({ percent: 80, externalConnected: true, notChargingReason: 4 }, { source: "ac", percent: 80 }),
    ).toEqual({ pluggedIn: true, percent: "80%", status: { state: "paused", text: undefined } });
  });

  it("on an Intel Mac without live adapter input, falls back to the charger's rating and says so", () => {
    expect(
      nowBatteryParts(
        { percent: 7, externalConnected: true, isCharging: false, notChargingReason: 0, adapterRatedW: 15 },
        { source: "ac", percent: 7 },
      ),
    ).toEqual({
      pluggedIn: true,
      percent: "7%",
      adapter: "15 W",
      adapterIsRating: true,
      status: { state: "not-charging", text: undefined },
    });
  });

  it("on AC adds what the power adapter is delivering", () => {
    expect(
      nowBatteryParts(
        { percent: 27, externalConnected: true, isCharging: true, adapterInputW: 134.3 },
        { source: "ac", percent: 27 },
      ),
    ).toEqual({ pluggedIn: true, percent: "27%", adapter: "134 W", status: { state: "charging", text: undefined } });
  });
});

describe("chargeState", () => {
  it("names the state an icon stands for", () => {
    expect(chargeState({ isCharging: true, percent: 27 }, { source: "ac" })).toBe("charging");
    expect(chargeState({ isCharging: false, percent: 80, notChargingReason: 4 }, { source: "ac" })).toBe("paused");
    expect(chargeState({ fullyCharged: true, percent: 100 }, { source: "ac" })).toBe("full");
    expect(chargeState({ isCharging: false, percent: 60, notChargingReason: 0 }, { source: "ac" })).toBe(
      "not-charging",
    );
    expect(chargeState({ percent: 46 }, { source: "battery" })).toBe("on-battery");
    expect(chargeState({}, undefined)).toBeUndefined();
  });
});

describe("chargingLabel", () => {
  it("gives the menu a short state", () => {
    expect(
      chargingLabel(
        { externalConnected: true, isCharging: false, percent: 80, notChargingReason: 4 },
        { source: "ac" },
      ),
    ).toBe("charge paused");
    expect(chargingLabel({ externalConnected: true, isCharging: true, percent: 27 }, { source: "ac" })).toBe(
      "charging",
    );
    expect(chargingLabel({ externalConnected: true, fullyCharged: true, percent: 100 }, { source: "ac" })).toBe("full");
    expect(
      chargingLabel(
        { externalConnected: true, isCharging: false, percent: 60, notChargingReason: 0 },
        { source: "ac" },
      ),
    ).toBe("not charging");
    expect(chargingLabel({ externalConnected: false, percent: 46 }, { source: "battery" })).toBeUndefined();
  });
});

describe("chargingExplanation", () => {
  it("explains a paused charge on AC", () => {
    expect(
      chargingExplanation(
        { externalConnected: true, isCharging: false, fullyCharged: false, percent: 80, notChargingReason: 4 },
        { source: "ac", percent: 80 },
      ),
    ).toBe("macOS paused charging at 80% (charge limit or Optimized Charging)");
  });

  it("does not claim a pause when the charger reports no reason", () => {
    expect(
      chargingExplanation(
        { externalConnected: true, isCharging: false, fullyCharged: false, percent: 60, notChargingReason: 0 },
        { source: "ac", percent: 60 },
      ),
    ).toBe("Not charging");
  });

  it("shows adapter input while charging", () => {
    expect(
      chargingExplanation(
        { externalConnected: true, isCharging: true, percent: 27, adapterInputW: 134.3 },
        { source: "ac" },
      ),
    ).toBe("Charging · 134 W from adapter");
  });

  it("says fully charged", () => {
    expect(
      chargingExplanation(
        { externalConnected: true, isCharging: false, fullyCharged: true, percent: 100 },
        { source: "ac" },
      ),
    ).toBe("Fully charged");
  });

  it("says nothing on battery", () => {
    expect(chargingExplanation({ externalConnected: false, percent: 46 }, { source: "battery" })).toBeUndefined();
  });
});

describe("healthPercent", () => {
  it("matches macOS's Maximum Capacity: nominal over design, capped at 100%", () => {
    // Seen on 2026-09-23: System Settings said 100%, full-charge alone gave 98%.
    expect(healthPercent({ nominalChargeCapacity: 8657, fullChargeCapacity: 8413, designCapacity: 8579 })).toBe(100);
    expect(healthPercent({ nominalChargeCapacity: 7722, designCapacity: 8579 })).toBe(90);
  });

  it("falls back to full-charge capacity when nominal is missing", () => {
    expect(healthPercent({ fullChargeCapacity: 8413, designCapacity: 8579 })).toBe(98);
  });

  it("is undefined without data", () => {
    expect(healthPercent({})).toBeUndefined();
  });
});
