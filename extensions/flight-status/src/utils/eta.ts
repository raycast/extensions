import { MS_TO_KNOTS } from "./units";

const EARTH_RADIUS_NM = 3440.065; // Nautical miles

// Descent/approach adds time that a naive distance/speed calc misses.
// Aircraft slow from ~450 kts cruise to ~140 kts on approach, and fly
// longer arrival routes. We model this as: average speed during the last
// portion of flight is significantly lower than current ground speed.
const APPROACH_PHASE_NM = 80; // Last ~80 nm is descent + approach
const APPROACH_SPEED_KNOTS = 210; // Average speed during descent/approach
const FINAL_APPROACH_MINUTES = 5; // Pattern, final, landing roll
// Below this, the aircraft isn't meaningfully en route (taxi/stationary/bad
// telemetry); dividing distance by such a speed yields an absurd ETA.
const MIN_GROUND_SPEED_KNOTS = 40;

/**
 * Calculate great-circle distance between two coordinates using the Haversine formula.
 * Returns distance in nautical miles.
 */
export function haversineDistanceNm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_NM * c;
}

/**
 * Estimate time remaining to destination in hours.
 * Returns null if the ground speed is missing or implausibly low.
 *
 * Continuous two-phase model:
 * - The last `APPROACH_PHASE_NM` (~80 nm) is flown at the reduced
 *   `APPROACH_SPEED_KNOTS` to account for descent/approach deceleration.
 * - Any distance beyond that is cruised at the current ground speed.
 * - `FINAL_APPROACH_MINUTES` covers the pattern, final, and landing roll.
 *
 * Because the approach segment is capped at the remaining distance rather than
 * switched on by a threshold, the estimate is continuous and monotonic in
 * distance (no jump at the 80 nm boundary, and no altitude-based shortcut).
 *
 * @param currentLat - Aircraft latitude
 * @param currentLon - Aircraft longitude
 * @param destLat - Destination airport latitude
 * @param destLon - Destination airport longitude
 * @param groundSpeedMs - Ground speed in m/s (from OpenSky)
 */
export function estimateEta(
  currentLat: number,
  currentLon: number,
  destLat: number,
  destLon: number,
  groundSpeedMs: number,
): number | null {
  if (!Number.isFinite(groundSpeedMs) || groundSpeedMs <= 0) {
    return null;
  }

  const distanceNm = haversineDistanceNm(
    currentLat,
    currentLon,
    destLat,
    destLon,
  );
  const speedKnots = groundSpeedMs * MS_TO_KNOTS;

  if (speedKnots < MIN_GROUND_SPEED_KNOTS) {
    return null;
  }

  const approachNm = Math.min(distanceNm, APPROACH_PHASE_NM);
  const cruiseNm = Math.max(0, distanceNm - APPROACH_PHASE_NM);

  return (
    cruiseNm / speedKnots +
    approachNm / APPROACH_SPEED_KNOTS +
    FINAL_APPROACH_MINUTES / 60
  );
}
