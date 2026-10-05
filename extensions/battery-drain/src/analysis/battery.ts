import { BatteryTelemetry, PowerSource } from "../types";

export function chargingExplanation(b: BatteryTelemetry, s?: PowerSource): string | undefined {
  const onAC = s ? s.source === "ac" : b.externalConnected;
  if (!onAC) return undefined;
  if (b.fullyCharged || (s?.percent ?? b.percent) === 100) return "Fully charged";
  if (b.isCharging) {
    return b.adapterInputW ? `Charging · ${Math.round(b.adapterInputW)} W from adapter` : "Charging";
  }
  // The reason codes are undocumented; only a non-zero reason is taken as a deliberate pause.
  if (!b.notChargingReason) return "Not charging";
  const percent = s?.percent ?? b.percent;
  return `macOS paused charging${percent !== undefined ? ` at ${percent}%` : ""} (charge limit or Optimized Charging)`;
}

/** A short charging state for the menu bar; the full explanation belongs in Diagnose and tooltips. */
export function chargingLabel(b: BatteryTelemetry, s?: PowerSource): string | undefined {
  const onAC = s ? s.source === "ac" : b.externalConnected;
  if (!onAC) return undefined;
  if (b.fullyCharged || (s?.percent ?? b.percent) === 100) return "full";
  if (b.isCharging) return "charging";
  return b.notChargingReason ? "charge paused" : "not charging";
}

/**
 * Matches macOS's "Maximum Capacity" in System Settings: nominal over design capacity, capped at 100%.
 * Full-charge capacity moves with calibration (97–98% on the same day), so it is only a fallback.
 */
export function healthPercent(b: BatteryTelemetry): number | undefined {
  const capacity = b.nominalChargeCapacity || b.fullChargeCapacity;
  if (!capacity || !b.designCapacity) return undefined;
  return Math.min(100, Math.round((capacity / b.designCapacity) * 100));
}

export type ChargeState = "charging" | "paused" | "full" | "not-charging" | "on-battery";

/** The charging state an icon stands for; undefined when there is no battery or no power source. */
export function chargeState(b: BatteryTelemetry, s?: PowerSource): ChargeState | undefined {
  const onAC = s ? s.source === "ac" : b.externalConnected;
  if (onAC === undefined || (b.percent === undefined && s?.percent === undefined)) return undefined;
  if (!onAC) return "on-battery";
  if (b.fullyCharged || (s?.percent ?? b.percent) === 100) return "full";
  if (b.isCharging) return "charging";
  return b.notChargingReason ? "paused" : "not-charging";
}
