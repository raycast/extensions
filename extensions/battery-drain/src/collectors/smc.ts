import { THRESHOLDS } from "../analysis/thresholds";
import { BatteryTelemetry } from "../types";

/**
 * SMC keys read on every poll, in watts:
 * - PSTR: the whole system's draw, on both Apple Silicon and Intel, whether from the battery or the adapter.
 * - PDTR (Apple Silicon) / PD0R (Intel): power coming in from the adapter.
 * PPBR is not used: it is the battery's output on Apple Silicon but something else on Intel (1.7 W while
 * charging at 28 W). Checked against ioreg on an Apple Silicon and an Intel MacBook on 2026-09-23.
 */
export const SMC_KEYS = ["PSTR", "PDTR", "PD0R"];

// PDTR reads a few microwatts without a charger.
const ADAPTER_NOISE_W = 0.5;

export type SmcPower = { systemW?: number; adapterInputW?: number };

export type SmcReader = (keys: string[]) => Promise<Record<string, number>>;

function plausible(w: number | undefined): w is number {
  return w !== undefined && Number.isFinite(w) && w >= 0 && w <= THRESHOLDS.maxPlausibleWatts;
}

export function parseSmc(values: Record<string, number>): SmcPower {
  const power: SmcPower = {};
  // A running Mac never draws 0 W, so 0 is a missing reading rather than an idle one.
  if (plausible(values.PSTR) && values.PSTR > 0) power.systemW = values.PSTR;
  const adapter = values.PDTR ?? values.PD0R;
  if (plausible(adapter)) power.adapterInputW = adapter < ADAPTER_NOISE_W ? 0 : adapter;
  return power;
}

/** SMC's live readings take precedence over ioreg's, which macOS refreshes about once a minute. */
export function applySmc(battery: BatteryTelemetry, smc: SmcPower, now: number): BatteryTelemetry {
  const next = { ...battery };
  if (smc.systemW !== undefined) {
    next.systemLoadW = smc.systemW;
    next.systemLoadEstimated = undefined;
    next.systemLoadLive = true;
    next.updatedAt = now;
  }
  if (smc.adapterInputW !== undefined && battery.externalConnected) next.adapterInputW = smc.adapterInputW;
  return next;
}
