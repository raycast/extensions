import type { UpcomingFlight } from "./api";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function plural(value: number, singular: string): string {
  return `${value} ${singular}${value === 1 ? "" : "s"}`;
}

export function effectiveDeparture(flight: UpcomingFlight): Date {
  return new Date(
    flight.flight.actualGateDepartureTime ??
      flight.flight.estimatedDepartureTime ??
      flight.flight.departureTime,
  );
}

export function effectiveArrival(flight: UpcomingFlight): Date | null {
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

export function formatDate(value: Date, timeZone: string | null): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timeZone ?? "UTC",
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
  airport: UpcomingFlight["departureAirport"] | null,
): string {
  return airport?.iata ?? airport?.icao ?? "TBD";
}

export function displayFlightNumber(flight: UpcomingFlight): string {
  const number = flight.flight.flightNumber.trim();
  const airlineCode = flight.airline.iata?.trim().toUpperCase();
  const compactNumber = number.replace(/\s+/g, "").toUpperCase();
  if (!airlineCode || compactNumber.startsWith(airlineCode)) return number;
  return `${airlineCode} ${number}`;
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
