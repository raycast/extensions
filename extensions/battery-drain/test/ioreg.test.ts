import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseIoreg } from "../src/collectors/ioreg";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

describe("parseIoreg", () => {
  it("parses a discharging MacBook", () => {
    expect(parseIoreg(fixture("ioreg-battery.txt"))).toEqual({
      externalConnected: false,
      isCharging: false,
      fullyCharged: false,
      percent: 46,
      cycleCount: 35,
      fullChargeCapacity: 8413,
      nominalChargeCapacity: 8657,
      designCapacity: 8579,
      notChargingReason: 128,
      systemLoadW: 3.422,
      adapterInputW: 0,
      temperatureC: undefined,
    });
  });

  it("uses SystemLoad, not battery power, while charging", () => {
    const t = parseIoreg(fixture("ioreg-charging.txt"));
    expect(t.systemLoadW).toBeCloseTo(11.55);
    expect(t.adapterInputW).toBeCloseTo(134.326);
    expect(t.isCharging).toBe(true);
    expect(t.percent).toBe(27);
  });

  it("treats a wrapped negative SystemLoad as unknown instead of 18 quadrillion watts", () => {
    // Seen on 2026-09-23 the moment the charger was plugged in.
    const text = fixture("ioreg-charging.txt").replace('"SystemLoad"=11550', '"SystemLoad"=18446744073709524123');
    expect(parseIoreg(text).systemLoadW).toBeUndefined();
  });

  describe("a real Intel MacBook (macOS 13.7.8) powered over a Mac-to-Mac USB-C cable (15 W)", () => {
    const t = parseIoreg(fixture("ioreg-intel-usb-bus-powered.txt"));

    it("does not trust BatteryData.SystemPower as the system draw", () => {
      // SystemPower said 6.9 W while the battery alone was supplying 13.7 W on top of the 15 W cable,
      // and 3.0 W while charging at 14 W from a 94 W adapter: it does not match the system's draw.
      expect(t.systemLoadW).toBeUndefined();
    });

    it("reads charge, health inputs, cycles and temperature from the Intel fields", () => {
      expect(t.percent).toBe(7); // 246 of 3713 mAh
      expect(t.fullChargeCapacity).toBe(3713);
      expect(t.designCapacity).toBe(4790);
      expect(t.cycleCount).toBe(169);
      expect(t.temperatureC).toBeCloseTo(30.18);
    });

    it("reads the adapter's rating, since Intel reports no live adapter input", () => {
      expect(t.adapterRatedW).toBe(15);
      expect(t.adapterInputW).toBeUndefined();
      expect(t.isCharging).toBe(false);
      expect(t.notChargingReason).toBe(0);
    });
  });

  describe("a real Intel MacBook (macOS 13.7.8) charging from a 140 W Apple USB-C adapter", () => {
    const t = parseIoreg(fixture("ioreg-intel-charging.txt"));

    it("reads the power the adapter negotiated with this Mac (94 W), not its 140 W label", () => {
      expect(t.adapterRatedW).toBe(94);
    });

    it("sees that it is charging, at 10%", () => {
      expect(t.isCharging).toBe(true);
      expect(t.percent).toBe(10); // 369 of 3856 mAh
    });

    it("leaves the system draw unknown on the adapter", () => {
      expect(t.systemLoadW).toBeUndefined();
    });
  });

  describe("a real Intel MacBook (macOS 13.7.8) on battery", () => {
    const t = parseIoreg(fixture("ioreg-intel-on-battery.txt"));

    it("calculates the system draw from the battery's instant volts × amps (11.124 V × 0.718 A)", () => {
      expect(t.systemLoadW).toBeCloseTo(7.99, 1);
      expect(t.systemLoadEstimated).toBe(true);
    });

    it("uses InstantAmperage, since the averaged Amperage still reads +378 mA from before the unplug", () => {
      const withoutInstant = fixture("ioreg-intel-on-battery.txt").replace(/ {6}"InstantAmperage" = \d+\n/, "");
      expect(parseIoreg(withoutInstant).systemLoadW).toBeUndefined(); // +378 mA is not a discharge
    });

    it("ignores BatteryData.SystemPower, which said 2.0 W here", () => {
      expect(t.systemLoadW).not.toBeCloseTo(2.04, 1);
    });

    it("a minute later, settled: 7.5 W (10.945 V × 0.683 A) and ioreg's 14% now agrees with pmset", () => {
      const settled = parseIoreg(fixture("ioreg-intel-on-battery-settled.txt"));
      expect(settled.systemLoadW).toBeCloseTo(7.48, 1);
      expect(settled.percent).toBe(14); // 530 of 3874 mAh; right after unplugging ioreg said 18%
    });
  });

  it("on an Intel MacBook without PowerTelemetryData, estimates system draw on battery from volts × amps", () => {
    const t = parseIoreg(fixture("ioreg-intel-battery.txt"));
    expect(t.systemLoadW).toBeCloseTo(12.3); // 12.3 V × 1.0 A
    expect(t.systemLoadEstimated).toBe(true);
    expect(t.percent).toBe(70); // 3570 of 5100 mAh
  });

  it("on an Intel MacBook reads capacities from the top-level mAh fields, so health works", () => {
    const t = parseIoreg(fixture("ioreg-intel-battery.txt"));
    expect(t.fullChargeCapacity).toBe(5100);
    expect(t.designCapacity).toBe(5800);
  });

  it("does not estimate on the adapter, where the current charges the battery instead", () => {
    const text = fixture("ioreg-intel-battery.txt")
      .replace('"ExternalConnected" = No', '"ExternalConnected" = Yes')
      .replace(/"InstantAmperage" = \d+/, '"InstantAmperage" = 2000');
    expect(parseIoreg(text).systemLoadW).toBeUndefined();
  });

  it("never estimates on Apple Silicon, where SystemLoad is present", () => {
    expect(parseIoreg(fixture("ioreg-battery.txt")).systemLoadEstimated).toBeUndefined();
  });

  it("treats a zero system draw as unknown: macOS zeroes telemetry when the charger is unplugged", () => {
    // Seen on 2026-09-23 14:19:59: SystemLoad=0 until the next refresh a minute later showed 7912 mW.
    const text = fixture("ioreg-battery.txt").replace('"SystemLoad"=3422', '"SystemLoad"=0');
    expect(parseIoreg(text).systemLoadW).toBeUndefined();
    expect(parseIoreg(text).adapterInputW).toBe(0); // on battery the adapter really delivers 0 W
  });

  it("rejects implausibly high readings", () => {
    const text = fixture("ioreg-charging.txt").replace('"SystemLoad"=11550', '"SystemLoad"=2500000');
    expect(parseIoreg(text).systemLoadW).toBeUndefined();
  });

  it("reads when macOS last refreshed the telemetry", () => {
    const text = `${fixture("ioreg-battery.txt")}      "UpdateTime" = 1790155687\n`;
    expect(parseIoreg(text).updatedAt).toBe(1790155687000);
  });

  it("reads temperature in centi-degrees when present", () => {
    expect(parseIoreg(fixture("ioreg-paused.txt")).temperatureC).toBeCloseTo(30.56);
  });

  it("returns an empty object for a Mac without a battery", () => {
    expect(parseIoreg("")).toEqual({
      externalConnected: undefined,
      isCharging: undefined,
      fullyCharged: undefined,
      percent: undefined,
      cycleCount: undefined,
      fullChargeCapacity: undefined,
      nominalChargeCapacity: undefined,
      designCapacity: undefined,
      notChargingReason: undefined,
      systemLoadW: undefined,
      adapterInputW: undefined,
      temperatureC: undefined,
    });
  });
});
