import { FlightSchedule } from "../types";

/** Delay-adjusted scheduled arrival time in epoch milliseconds. */
export function effectiveArrivalMs(schedule: FlightSchedule): number {
  return (schedule.arrTimeTs + (schedule.arrDelayed ?? 0) * 60) * 1000;
}

/**
 * Whether a cached schedule is stale enough to reset (its adjusted arrival is
 * more than `bufferMs` in the past).
 *
 * Live airborne telemetry overrides this: a flight that is still in the air is
 * not "expired" even if its scheduled arrival is long past. Otherwise a
 * badly-delayed flight with a stale schedule would reset, refetch the same
 * past-dated schedule, and reset again in an unbounded loop.
 */
export function isScheduleExpired(
  schedule: FlightSchedule | null,
  nowMs: number,
  bufferMs: number,
  isAirborneNow: boolean,
): boolean {
  if (schedule == null || schedule.arrTimeTs <= 0) return false;
  if (isAirborneNow) return false;
  return nowMs > effectiveArrivalMs(schedule) + bufferMs;
}
