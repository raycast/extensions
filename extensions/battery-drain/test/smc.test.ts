import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseIoreg } from "../src/collectors/ioreg";
import { applySmc, parseSmc } from "../src/collectors/smc";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

describe("parseSmc", () => {
  it("reads the live system draw and adapter input on Apple Silicon (PSTR, PDTR)", () => {
    // Real reading on 2026-09-23, on battery: PDTR is not quite zero without a charger.
    expect(parseSmc({ PSTR: 16.914, PPBR: 16.978, PDTR: 0.0000467 })).toEqual({ systemW: 16.914, adapterInputW: 0 });
  });

  it("reads Intel's adapter input from PD0R, which agrees with the physics", () => {
    // Real Intel MacBook on a 140 W adapter: 57.65 W in, 27.90 W into the battery (ioreg volts × amps),
    // leaving 29.75 W for the system, and PSTR said 29.73 W.
    expect(parseSmc({ PSTR: 29.73, PD0R: 57.65, PPBR: 1.69 })).toEqual({ systemW: 29.73, adapterInputW: 57.65 });
  });

  it("ignores PPBR, which means battery output on one Mac and something else on another", () => {
    expect(parseSmc({ PPBR: 19.4 })).toEqual({});
  });

  it("leaves out readings that are zero, negative, not a number or implausibly high", () => {
    expect(parseSmc({ PSTR: 0 }).systemW).toBeUndefined();
    expect(parseSmc({ PSTR: -3 }).systemW).toBeUndefined();
    expect(parseSmc({ PSTR: Number.NaN }).systemW).toBeUndefined();
    expect(parseSmc({ PSTR: 5000 }).systemW).toBeUndefined();
    expect(parseSmc({ PSTR: 10, PDTR: -1 }).adapterInputW).toBeUndefined();
  });

  it("returns nothing when SMC could not be read", () => {
    expect(parseSmc({})).toEqual({});
  });
});

describe("applySmc", () => {
  const now = 1_790_166_500_000;

  it("replaces the once-a-minute system draw with the live one and dates it now", () => {
    const b = applySmc(parseIoreg(fixture("ioreg-battery.txt")), { systemW: 8.2 }, now);
    expect(b.systemLoadW).toBe(8.2);
    expect(b.systemLoadLive).toBe(true);
    expect(b.updatedAt).toBe(now);
  });

  it("replaces Intel's volts × amps estimate on battery, so the reading is no longer marked estimated", () => {
    const b = applySmc(parseIoreg(fixture("ioreg-intel-on-battery.txt")), { systemW: 8.2 }, now);
    expect(b.systemLoadW).toBe(8.2);
    expect(b.systemLoadEstimated).toBeUndefined();
  });

  it("fills in Intel's system draw and live adapter input while charging", () => {
    const b = applySmc(parseIoreg(fixture("ioreg-intel-charging.txt")), { systemW: 29.73, adapterInputW: 57.65 }, now);
    expect(b.systemLoadW).toBe(29.73);
    expect(b.adapterInputW).toBe(57.65);
    expect(b.adapterRatedW).toBe(94); // still known, for the tooltip
  });

  it("takes adapter input only while a charger is connected", () => {
    const b = applySmc(parseIoreg(fixture("ioreg-intel-on-battery.txt")), { systemW: 8.2, adapterInputW: 3 }, now);
    expect(b.adapterInputW).toBeUndefined();
  });

  it("keeps ioreg's readings when SMC has none", () => {
    const ioreg = parseIoreg(fixture("ioreg-battery.txt"));
    expect(applySmc(ioreg, {}, now)).toEqual(ioreg);
  });
});
