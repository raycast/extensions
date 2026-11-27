import type { UpcomingFlight } from "./api";
import {
  formatFlightDesignator,
  parseFlightDesignator,
} from "./flight-designator";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function plural(value: number, singular: string): string {
  return `${value} ${singular}${value === 1 ? "" : "s"}`;
}

export function effectiveDeparture(flight: {
  flight: Pick<
    UpcomingFlight["flight"],
    "actualGateDepartureTime" | "estimatedDepartureTime" | "departureTime"
  >;
}): Date {
  return new Date(
    flight.flight.actualGateDepartureTime ??
      flight.flight.estimatedDepartureTime ??
      flight.flight.departureTime,
  );
}

export function effectiveArrival(flight: {
  flight: Pick<
    UpcomingFlight["flight"],
    "actualGateArrivalTime" | "estimatedArrivalTime" | "arrivalTime"
  >;
}): Date | null {
  const value =
    flight.flight.actualGateArrivalTime ??
    flight.flight.estimatedArrivalTime ??
    flight.flight.arrivalTime;
  return value ? new Date(value) : null;
}

export function formatCountdown(target: Date, now = new Date()): string {
  const difference = target.getTime() - now.getTime();
  if (difference <= 0 && difference > -15 * MINUTE_MS) return "Departing now";
  if (difference <= 0) return "Departed";

  const days = Math.floor(difference / DAY_MS);
  const hours = Math.floor((difference % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((difference % HOUR_MS) / MINUTE_MS);
  const parts = [
    days > 0 ? plural(days, "day") : null,
    hours > 0 ? plural(hours, "hour") : null,
    plural(minutes, "minute"),
  ].filter((part): part is string => part !== null);

  return `Departing in ${parts.join(", ")}`;
}

export function formatCompactCountdown(target: Date, now = new Date()): string {
  const difference = target.getTime() - now.getTime();
  if (difference <= 0 && difference > -15 * MINUTE_MS) return "Now";
  if (difference <= 0) return "Departed";

  const days = Math.floor(difference / DAY_MS);
  if (days > 0) return `${days}d`;

  const hours = Math.floor(difference / HOUR_MS);
  if (hours > 0) return `${hours}h`;

  const minutes = Math.floor(difference / MINUTE_MS);
  return `${minutes}m`;
}

// A duration rounded up to the minute, so a flight never shows "0m" while it is
// still in the air.
export function formatCompactDuration(milliseconds: number): string {
  const totalMinutes = Math.max(1, Math.ceil(milliseconds / MINUTE_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export function formatProgressBar(fraction: number, width = 10): string {
  const filled = Math.round(Math.min(Math.max(fraction, 0), 1) * width);
  return "▰".repeat(filled) + "▱".repeat(width - filled);
}

export function formatDate(value: Date, timeZone: string | null): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timeZone ?? "UTC",
  }).format(value);
}

// A short local date for list rows, with the year only when it differs from
// the current one: "Sat, 28 Nov" or "Mon, 1 Feb 2027".
export function formatListDate(
  value: Date,
  timeZone: string | null,
  now = new Date(),
): string {
  const zone = timeZone ?? "UTC";
  const year = (date: Date) =>
    new Intl.DateTimeFormat("en", { year: "numeric", timeZone: zone }).format(
      date,
    );
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: year(value) === year(now) ? undefined : "numeric",
    timeZone: zone,
  }).format(value);
}

export function formatTime(
  value: Date | null,
  timeZone: string | null,
): string {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: timeZone ?? "UTC",
  }).format(value);
}

export function airportCode(
  airport: Pick<UpcomingFlight["departureAirport"], "iata" | "icao"> | null,
): string {
  return airport?.iata ?? airport?.icao ?? "TBD";
}

interface FlightNumberFields {
  flight: Pick<UpcomingFlight["flight"], "flightNumber">;
  airline: Pick<UpcomingFlight["airline"], "iata" | "icao">;
}

function flightDesignator(flight: FlightNumberFields) {
  return parseFlightDesignator({
    airlineCode: flight.airline.iata,
    alternateAirlineCode: flight.airline.icao,
    flightNumber: flight.flight.flightNumber,
  });
}

export function displayFlightNumber(flight: FlightNumberFields): string {
  return formatFlightDesignator(flightDesignator(flight), "spaced");
}

export function flightNumberKeywords(flight: FlightNumberFields): string[] {
  const designator = flightDesignator(flight);
  if (!designator) return [];
  return [
    ...new Set([
      formatFlightDesignator(designator, "spaced"),
      formatFlightDesignator(designator, "compact"),
      designator.flightNumber,
    ]),
  ];
}

export function formatEnumLabel(value: string | null): string {
  if (!value) return "Not added";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

type FlightStatusFields = Pick<
  UpcomingFlight["flight"],
  "onTimeStatus" | "boardState" | "flightPhase" | "flightState"
>;

export function formatFlightStatus(flight: FlightStatusFields): string {
  const onTimeStatus = flight.onTimeStatus?.trim();
  if (
    onTimeStatus &&
    ["unknown", "none"].includes(onTimeStatus.toLowerCase())
  ) {
    return "Scheduled";
  }

  const status = [
    onTimeStatus,
    flight.boardState,
    flight.flightPhase,
    flight.flightState,
  ].find((value) => {
    const normalized = value?.trim().toLowerCase();
    return normalized && normalized !== "unknown" && normalized !== "none";
  });

  if (!status || status.trim().toLowerCase() === "countdown") {
    return "Scheduled";
  }

  const normalized = status
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

type AircraftNameFields = Pick<
  UpcomingFlight["flight"],
  | "aircraftDisplayName"
  | "aircraftExactModelName"
  | "aircraftManufacturer"
  | "aircraftName"
>;

export function aircraftName(flight: { flight: AircraftNameFields }): string {
  const model = (
    flight.flight.aircraftDisplayName ??
    flight.flight.aircraftExactModelName ??
    flight.flight.aircraftName
  )?.trim();
  const manufacturer = flight.flight.aircraftManufacturer?.trim();

  if (!model) return manufacturer || "Not assigned";
  if (
    !manufacturer ||
    model.toLowerCase().startsWith(manufacturer.toLowerCase())
  ) {
    return model;
  }
  return `${manufacturer} ${model}`;
}

export function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()<>#+\-.!|])/g, "\\$1");
}
