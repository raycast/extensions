import type { UpcomingFlight } from "./api";
import {
  airportCode,
  effectiveDeparture,
  formatCompactCountdown,
  formatFlightStatus,
} from "./format";

export const ACTIVE_REFRESH_INTERVAL_MS = 60_000;
export const DISTANT_REFRESH_INTERVAL_MS = 5 * 60_000;
export const EMPTY_REFRESH_INTERVAL_MS = 15 * 60_000;

const SIX_HOURS_MS = 6 * 60 * 60_000;

function normalizedStatusValues(flight: UpcomingFlight): string[] {
  return [
    flight.flight.boardState,
    flight.flight.flightPhase,
    flight.flight.flightState,
    flight.flight.onTimeStatus,
  ]
    .map((value) =>
      value
        ?.trim()
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .toLowerCase(),
    )
    .filter((value): value is string => Boolean(value));
}

function hasStatus(flight: UpcomingFlight, pattern: RegExp): boolean {
  return normalizedStatusValues(flight).some((value) => pattern.test(value));
}

export function isArrivedFlight(flight: UpcomingFlight): boolean {
  if (flight.flight.actualGateArrivalTime) return true;
  return hasStatus(
    flight,
    /^(arrived|arrival|at gate|gate arrival|completed|complete)$/,
  );
}

export function isActiveFlight(flight: UpcomingFlight): boolean {
  if (isArrivedFlight(flight)) return false;
  if (flight.flight.actualGateDepartureTime) return true;
  if (flight.flight.actualTakeoffTime) return true;
  if (flight.flight.actualLandingTime) return true;
  return hasStatus(
    flight,
    /\b(boarding|final call|gate closed|taxi out|taxi in|taxiing|in flight|airborne|en route|enroute|departed|landing|landed|overdue)\b/,
  );
}

export function selectMenuBarFlight(
  flights: UpcomingFlight[],
  now = new Date(),
): UpcomingFlight | null {
  const byDeparture = (left: UpcomingFlight, right: UpcomingFlight) =>
    effectiveDeparture(left).getTime() - effectiveDeparture(right).getTime();
  const active = flights.filter(isActiveFlight).sort(byDeparture);
  if (active[0]) return active[0];

  return (
    flights
      .filter(
        (flight) =>
          !isArrivedFlight(flight) &&
          effectiveDeparture(flight).getTime() > now.getTime(),
      )
      .sort(byDeparture)[0] ?? null
  );
}

function delayMinutes(flight: UpcomingFlight): number | null {
  const actualOrEstimate =
    flight.flight.actualGateDepartureTime ??
    flight.flight.estimatedDepartureTime;
  if (!actualOrEstimate) return null;
  const difference =
    Date.parse(actualOrEstimate) - Date.parse(flight.flight.departureTime);
  return difference > 0 ? Math.round(difference / 60_000) : null;
}

export function operationalMenuBarStatus(
  flight: UpcomingFlight,
): string | null {
  if (isArrivedFlight(flight)) return "Arrived";
  if (flight.flight.actualLandingTime) return "Taxi In";
  if (hasStatus(flight, /\b(taxi in)\b/)) return "Taxi In";
  if (hasStatus(flight, /\b(landing|landed)\b/)) return "Landing";
  if (
    flight.flight.actualTakeoffTime ||
    hasStatus(flight, /\b(in flight|airborne|en route|enroute)\b/)
  )
    return "In Flight";
  if (hasStatus(flight, /\b(taxi out|taxiing)\b/)) return "Taxiing";
  if (hasStatus(flight, /\b(final call)\b/)) return "Final Call";
  if (hasStatus(flight, /\b(boarding)\b/)) return "Boarding";
  if (hasStatus(flight, /\b(gate closed)\b/)) return "Gate Closed";
  if (hasStatus(flight, /\b(departed)\b/)) return "Departed";
  if (hasStatus(flight, /\b(cancelled|canceled)\b/)) return "Cancelled";
  if (hasStatus(flight, /\b(delayed|delay|late)\b/)) {
    const minutes = delayMinutes(flight);
    return minutes ? `Delayed ${minutes}m` : "Delayed";
  }
  if (isActiveFlight(flight)) return formatFlightStatus(flight.flight);
  return null;
}

export function menuBarTitle(flight: UpcomingFlight, now = new Date()): string {
  const operationalStatus = operationalMenuBarStatus(flight);
  if (operationalStatus) return operationalStatus;

  const city =
    flight.arrivalAirport?.city?.trim() || airportCode(flight.arrivalAirport);
  return `${city} in ${formatCompactCountdown(effectiveDeparture(flight), now)}`;
}

export function menuBarRefreshInterval(
  flight: UpcomingFlight | null,
  now = new Date(),
): number {
  if (!flight) return EMPTY_REFRESH_INTERVAL_MS;
  if (isActiveFlight(flight)) return ACTIVE_REFRESH_INTERVAL_MS;

  const untilDeparture = effectiveDeparture(flight).getTime() - now.getTime();
  return untilDeparture <= SIX_HOURS_MS
    ? ACTIVE_REFRESH_INTERVAL_MS
    : DISTANT_REFRESH_INTERVAL_MS;
}

export type MenuBarLoadState =
  "loading" | "ready" | "empty" | "stale-error" | "error";

export function resolveMenuBarLoadState({
  latestFlights,
  lastSuccessfulFlights,
  error,
}: {
  latestFlights: UpcomingFlight[] | undefined;
  lastSuccessfulFlights: UpcomingFlight[] | undefined;
  error: Error | undefined;
}): { state: MenuBarLoadState; flights: UpcomingFlight[] } {
  if (error) {
    return lastSuccessfulFlights
      ? { state: "stale-error", flights: lastSuccessfulFlights }
      : { state: "error", flights: [] };
  }
  if (!latestFlights) return { state: "loading", flights: [] };
  return latestFlights.length > 0
    ? { state: "ready", flights: latestFlights }
    : { state: "empty", flights: [] };
}
