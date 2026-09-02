import { FlightPhase, OpenSkyState } from "../types";
import { METERS_TO_FEET } from "./units";

const CRUISING_ALTITUDE_THRESHOLD_FT = 20000;
const ALTITUDE_STABILITY_THRESHOLD_FT = 500;

/**
 * Derive the current flight phase from telemetry data.
 *
 * @param state - Current OpenSky state vector
 * @param altitudeHistory - Recent altitude readings in meters (oldest first),
 *   including the current reading as the last element (the caller appends the
 *   latest sample before deriving).
 * @param wasAirborne - Whether the aircraft was previously detected airborne
 */
export function deriveFlightPhase(
  state: OpenSkyState,
  altitudeHistory: number[],
  wasAirborne: boolean,
): FlightPhase {
  if (state.onGround) {
    return wasAirborne ? FlightPhase.Landed : FlightPhase.OnGround;
  }

  const altitudeFt =
    state.baroAltitude != null ? state.baroAltitude * METERS_TO_FEET : null;

  if (altitudeFt == null) {
    return FlightPhase.Climbing;
  }

  // Need at least 2 samples to determine trend
  if (altitudeHistory.length < 2) {
    return altitudeFt > CRUISING_ALTITUDE_THRESHOLD_FT
      ? FlightPhase.Cruising
      : FlightPhase.Climbing;
  }

  // Convert history to feet for comparison
  const historyFt = altitudeHistory.map((m) => m * METERS_TO_FEET);

  // Check if altitude is stable (all samples within threshold of each other)
  const minAlt = Math.min(...historyFt, altitudeFt);
  const maxAlt = Math.max(...historyFt, altitudeFt);
  const isStable = maxAlt - minAlt < ALTITUDE_STABILITY_THRESHOLD_FT;

  if (isStable && altitudeFt > CRUISING_ALTITUDE_THRESHOLD_FT) {
    return FlightPhase.Cruising;
  }

  // Determine trend from the previous reading (the last element is the current
  // reading, so the one before it is the prior sample).
  const prev = historyFt[historyFt.length - 2];
  const diff = altitudeFt - prev;

  if (diff > ALTITUDE_STABILITY_THRESHOLD_FT) {
    return FlightPhase.Climbing;
  } else if (diff < -ALTITUDE_STABILITY_THRESHOLD_FT) {
    return FlightPhase.Descending;
  }

  // Small change — maintain previous trend based on overall history
  const oldest = historyFt[0];
  const overallDiff = altitudeFt - oldest;

  if (overallDiff > ALTITUDE_STABILITY_THRESHOLD_FT) {
    return FlightPhase.Climbing;
  } else if (overallDiff < -ALTITUDE_STABILITY_THRESHOLD_FT) {
    return FlightPhase.Descending;
  }

  // Stable but below cruising altitude
  return altitudeFt > CRUISING_ALTITUDE_THRESHOLD_FT
    ? FlightPhase.Cruising
    : FlightPhase.Climbing;
}

/**
 * Whether the aircraft is in flight.
 *
 * A null phase means there is no live telemetry, which is NOT airborne — so an
 * ETA (e.g. from FlightAware) isn't shown next to a "Not Active" status.
 */
export function isAirborne(phase: FlightPhase | null): boolean {
  return (
    phase != null &&
    phase !== FlightPhase.OnGround &&
    phase !== FlightPhase.Landed
  );
}
