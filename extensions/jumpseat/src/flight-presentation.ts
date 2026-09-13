import type { UpcomingFlight } from "./api";
import { getJumpseatConfiguration } from "./config";
import {
  aircraftName,
  airportCode,
  displayFlightNumber,
  effectiveArrival,
  effectiveDeparture,
  formatDate,
  formatFlightStatus,
  formatTime,
} from "./format";

export function valueOrFallback(
  value: string | null | undefined,
  fallback: string,
): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function airportLabel(
  airport: UpcomingFlight["departureAirport"] | null,
): string {
  if (!airport) return "Not available";
  const place = [airport.city, airport.country].filter(Boolean).join(", ");
  return place ? `${airport.name} · ${place}` : airport.name;
}

export function jumpseatFlightUrl(flight: UpcomingFlight): string {
  return new URL(
    `/flight/${encodeURIComponent(flight.flight.id)}`,
    getJumpseatConfiguration().webBaseUrl,
  ).toString();
}

export function flightSummary(flight: UpcomingFlight): string {
  const departure = effectiveDeparture(flight);
  const arrival = effectiveArrival(flight);
  const route = `${airportCode(flight.departureAirport)} → ${airportCode(flight.arrivalAirport)}`;
  return [
    `${displayFlightNumber(flight)} · ${route}`,
    `Status: ${formatFlightStatus(flight.flight)}`,
    `${formatDate(departure, flight.departureAirport.timeZoneRegionName)} at ${formatTime(departure, flight.departureAirport.timeZoneRegionName)}`,
    `Departure: Terminal ${valueOrFallback(flight.flight.departureTerminal, "TBD")}, Gate ${valueOrFallback(flight.flight.departureGate, "TBD")}`,
    `Arrival: ${formatTime(arrival, flight.arrivalAirport?.timeZoneRegionName ?? null)}, Terminal ${valueOrFallback(flight.flight.arrivalTerminal, "TBD")}, Gate ${valueOrFallback(flight.flight.arrivalGate, "TBD")}`,
    `Seat: ${valueOrFallback(flight.seatNumber, "Not added")}`,
    `Aircraft: ${aircraftName(flight)}`,
  ].join("\n");
}
