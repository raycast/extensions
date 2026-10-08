import type { UpcomingFlight } from "./api";
import {
  airportCode,
  effectiveDeparture,
  formatCompactCountdown,
  formatFlightStatus,
} from "./format";

type MenuBarAirport = Pick<
  UpcomingFlight["departureAirport"],
  "iata" | "icao" | "timeZoneRegionName"
>;

type MenuBarArrivalAirport = MenuBarAirport &
  Pick<UpcomingFlight["departureAirport"], "city">;

export interface MenuBarFlight {
  flight: Pick<
    UpcomingFlight["flight"],
    | "id"
    | "flightNumber"
    | "departureTime"
    | "arrivalTime"
    | "estimatedDepartureTime"
    | "estimatedArrivalTime"
    | "actualGateDepartureTime"
    | "actualTakeoffTime"
    | "actualLandingTime"
    | "actualGateArrivalTime"
    | "departureGate"
    | "arrivalGate"
    | "departureTerminal"
    | "arrivalTerminal"
    | "checkIn"
    | "belt"
    | "aircraftName"
    | "aircraftDisplayName"
    | "aircraftExactModelName"
    | "aircraftManufacturer"
    | "flightState"
    | "boardState"
    | "flightPhase"
    | "onTimeStatus"
  >;
  airline: Pick<UpcomingFlight["airline"], "iata" | "logoUrl">;
  departureAirport: MenuBarAirport;
  arrivalAirport: MenuBarArrivalAirport | null;
}

function menuBarAirport(airport: MenuBarAirport): MenuBarAirport {
  return {
    iata: airport.iata,
    icao: airport.icao,
    timeZoneRegionName: airport.timeZoneRegionName,
  };
}

function menuBarArrivalAirport(
  airport: UpcomingFlight["departureAirport"],
): MenuBarArrivalAirport {
  return { ...menuBarAirport(airport), city: airport.city };
}

// Explicitly allowlist every cached field, including nested objects. Neither
// booking details nor future API response fields may reach the disk cache.
export function projectMenuBarFlight(source: UpcomingFlight): MenuBarFlight {
  return {
    flight: {
      id: source.flight.id,
      flightNumber: source.flight.flightNumber,
      departureTime: source.flight.departureTime,
      arrivalTime: source.flight.arrivalTime,
      estimatedDepartureTime: source.flight.estimatedDepartureTime,
      estimatedArrivalTime: source.flight.estimatedArrivalTime,
      actualGateDepartureTime: source.flight.actualGateDepartureTime,
      actualTakeoffTime: source.flight.actualTakeoffTime,
      actualLandingTime: source.flight.actualLandingTime,
      actualGateArrivalTime: source.flight.actualGateArrivalTime,
      departureGate: source.flight.departureGate,
      arrivalGate: source.flight.arrivalGate,
      departureTerminal: source.flight.departureTerminal,
      arrivalTerminal: source.flight.arrivalTerminal,
      checkIn: source.flight.checkIn,
      belt: source.flight.belt,
      aircraftName: source.flight.aircraftName,
      aircraftDisplayName: source.flight.aircraftDisplayName,
      aircraftExactModelName: source.flight.aircraftExactModelName,
      aircraftManufacturer: source.flight.aircraftManufacturer,
      flightState: source.flight.flightState,
      boardState: source.flight.boardState,
      flightPhase: source.flight.flightPhase,
      onTimeStatus: source.flight.onTimeStatus,
    },
    airline: { iata: source.airline.iata, logoUrl: source.airline.logoUrl },
    departureAirport: menuBarAirport(source.departureAirport),
    arrivalAirport: source.arrivalAirport
      ? menuBarArrivalAirport(source.arrivalAirport)
      : null,
  };
}

function normalizedStatusValues(flight: MenuBarFlight): string[] {
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

function hasStatus(flight: MenuBarFlight, pattern: RegExp): boolean {
  return normalizedStatusValues(flight).some((value) => pattern.test(value));
}

export function isArrivedFlight(flight: MenuBarFlight): boolean {
  if (flight.flight.actualGateArrivalTime) return true;
  return hasStatus(
    flight,
    /^(arrived|arrival|at gate|gate arrival|completed|complete)$/,
  );
}

export function isActiveFlight(flight: MenuBarFlight): boolean {
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
  flights: MenuBarFlight[],
  now = new Date(),
): MenuBarFlight | null {
  const byDeparture = (left: MenuBarFlight, right: MenuBarFlight) =>
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

function delayMinutes(flight: MenuBarFlight): number | null {
  const actualOrEstimate =
    flight.flight.actualGateDepartureTime ??
    flight.flight.estimatedDepartureTime;
  if (!actualOrEstimate) return null;
  const difference =
    Date.parse(actualOrEstimate) - Date.parse(flight.flight.departureTime);
  return difference > 0 ? Math.round(difference / 60_000) : null;
}

export function operationalMenuBarStatus(flight: MenuBarFlight): string | null {
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

export function menuBarTitle(flight: MenuBarFlight, now = new Date()): string {
  const operationalStatus = operationalMenuBarStatus(flight);
  if (operationalStatus) return operationalStatus;

  const city =
    flight.arrivalAirport?.city?.trim() || airportCode(flight.arrivalAirport);
  return `${city} in ${formatCompactCountdown(effectiveDeparture(flight), now)}`;
}

export type MenuBarLoadState =
  "loading" | "ready" | "empty" | "stale-error" | "error";

export function resolveMenuBarLoadState({
  latestFlights,
  lastSuccessfulFlights,
  error,
}: {
  latestFlights: MenuBarFlight[] | undefined;
  lastSuccessfulFlights: MenuBarFlight[] | undefined;
  error: Error | undefined;
}): { state: MenuBarLoadState; flights: MenuBarFlight[] } {
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
