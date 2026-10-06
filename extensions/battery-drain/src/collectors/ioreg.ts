import { THRESHOLDS } from "../analysis/thresholds";
import { BatteryTelemetry } from "../types";

const LINE = /^[\s|]*"(\w+)" = (.*)$/;
const TWO_63 = BigInt(2) ** BigInt(63);
const TWO_64 = BigInt(2) ** BigInt(64);

type Value = number | boolean | Record<string, number> | undefined;

/** ioreg prints negative 64-bit values as unsigned, e.g. 18446744073709524123; turn them back into negatives. */
function toNumber(digits: string): number {
  if (digits.length < 19) return Number(digits);
  const big = BigInt(digits);
  return Number(big >= TWO_63 ? big - TWO_64 : big);
}

function parseValue(raw: string): Value {
  const v = raw.trim();
  if (v === "Yes") return true;
  if (v === "No") return false;
  if (/^\d+$/.test(v)) return toNumber(v);
  if (v.startsWith("{")) {
    const dict: Record<string, number> = {};
    for (const m of v.matchAll(/"(\w+)"=(\d+)/g)) dict[m[1]] = toNumber(m[2]);
    return dict;
  }
  return undefined;
}

/** mW → W, or undefined when the reading is negative or implausibly high (a glitch, e.g. when a charger connects). */
function watts(mW: number | undefined): number | undefined {
  if (mW === undefined) return undefined;
  const w = mW / 1000;
  return w >= 0 && w <= THRESHOLDS.maxPlausibleWatts ? w : undefined;
}

function num(v: Value): number | undefined {
  return typeof v === "number" ? v : undefined;
}

function bool(v: Value): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

function dict(v: Value): Record<string, number> {
  return v !== undefined && typeof v === "object" ? v : {};
}

export function parseIoreg(text: string): BatteryTelemetry {
  const keys: Record<string, Value> = {};
  for (const line of text.split("\n")) {
    const m = LINE.exec(line);
    if (m) keys[m[1]] = parseValue(m[2]);
  }

  const telemetry = dict(keys.PowerTelemetryData);
  const charger = dict(keys.ChargerData);
  const battery = dict(keys.BatteryData);
  const current = num(keys.CurrentCapacity);
  const max = num(keys.MaxCapacity);
  const temperature = num(keys.Temperature);
  const updateTime = num(keys.UpdateTime);
  const external = bool(keys.ExternalConnected);

  // Apple Silicon reports PowerTelemetryData.SystemLoad. Intel has none; on battery the battery's
  // output (volts × amps, negative while discharging) is what the system draws. Intel's
  // BatteryData.SystemPower is not used: on a real Intel MacBook it disagreed with the physics
  // (6.9 W while the battery alone supplied 13.7 W), so it is not the system draw.
  // A running Mac never draws 0 W: macOS zeroes SystemLoad when the charger is unplugged, until the
  // next refresh up to a minute later, so 0 is unknown rather than a false drop.
  const measured = telemetry.SystemLoad;
  const adapter = dict(keys.AdapterDetails);
  let systemLoadW: number | undefined;
  let systemLoadEstimated: true | undefined;
  if (measured !== undefined) {
    systemLoadW = measured === 0 ? undefined : watts(measured);
  } else if (external === false) {
    const volts = num(keys.Voltage);
    const amps = num(keys.InstantAmperage) ?? num(keys.Amperage);
    if (volts !== undefined && amps !== undefined && amps < 0) {
      systemLoadW = watts((volts * -amps) / 1000);
      systemLoadEstimated = systemLoadW !== undefined ? true : undefined;
    }
  }

  return {
    externalConnected: external,
    isCharging: bool(keys.IsCharging),
    fullyCharged: bool(keys.FullyCharged),
    percent: current !== undefined && max ? Math.round((current / max) * 100) : undefined,
    cycleCount: num(keys.CycleCount),
    // Intel keeps capacities in top-level mAh fields, where MaxCapacity is the full charge; Apple Silicon
    // keeps them in BatteryData and reports MaxCapacity as a percentage (100).
    fullChargeCapacity: battery.FullChargeCapacity ?? (max !== undefined && max > 100 ? max : undefined),
    nominalChargeCapacity: battery.NominalChargeCapacity,
    designCapacity: battery.DesignCapacity ?? num(keys.DesignCapacity),
    notChargingReason: charger.NotChargingReason,
    systemLoadW,
    systemLoadEstimated,
    adapterInputW: watts(telemetry.SystemPowerIn),
    // Power negotiated with the charger (Intel; e.g. 94 W from a 140 W adapter). Apple Silicon leaves it empty.
    adapterRatedW: external && adapter.Watts ? adapter.Watts : undefined,
    temperatureC: temperature === undefined ? undefined : temperature / 100,
    updatedAt: updateTime === undefined ? undefined : updateTime * 1000,
  };
}
