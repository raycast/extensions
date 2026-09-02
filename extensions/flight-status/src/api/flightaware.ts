import { FlightAwareStatus } from "../types";
import { fetchJson } from "./http";

const AEROAPI_BASE_URL = "https://aeroapi.flightaware.com/aeroapi";

interface AeroApiFlight {
  status: string;
  diverted: boolean;
  cancelled: boolean;
  progress_percent: number | null;
  gate_destination: string | null;
  terminal_destination: string | null;
  baggage_claim: string | null;
  estimated_on: string | null;
  estimated_in: string | null;
  actual_on: string | null;
  actual_in: string | null;
}

interface AeroApiFlightResponse {
  flights: AeroApiFlight[];
}

/**
 * Determine if a flight is still active (not arrived/cancelled).
 * A flight is active if it has no actual landing time and its status
 * doesn't indicate it has already arrived or been cancelled — the status check
 * matches the "cancel" substring, covering both "Cancelled" and "Canceled".
 */
function isActiveFlight(flight: AeroApiFlight): boolean {
  if (flight.actual_on || flight.cancelled) return false;
  const lower = (flight.status ?? "").toLowerCase();
  // "cancel" matches both "cancelled" (en-GB) and "canceled" (en-US).
  return !lower.includes("arrived") && !lower.includes("cancel");
}

/**
 * Select the most relevant flight from the API response.
 *
 * Priority:
 * 1. Diverted flights — most critical status to surface
 * 2. En-route flights (progress_percent > 0) — actually in the air
 * 3. Any active (scheduled but not yet departed) flight
 */
function selectFlight(flights: AeroApiFlight[]): AeroApiFlight | null {
  return (
    flights.find((f) => f.diverted && isActiveFlight(f)) ??
    flights.find(
      (f) =>
        isActiveFlight(f) &&
        f.progress_percent != null &&
        f.progress_percent > 0,
    ) ??
    flights.find(isActiveFlight) ??
    null
  );
}

/**
 * Fetch real-time flight status from FlightAware AeroAPI.
 *
 * Returns the active flight's predictive ETA and gate info,
 * or null if no active flight is found or an error occurs.
 *
 * @param ident - ICAO callsign (e.g., "UAL745") or IATA flight number (e.g., "UA745")
 * @param apiKey - FlightAware AeroAPI key
 */
export async function fetchFlightStatus(
  ident: string,
  apiKey: string,
): Promise<FlightAwareStatus | null> {
  const url = `${AEROAPI_BASE_URL}/flights/${ident}`;
  const data = await fetchJson<AeroApiFlightResponse>(url, "FlightAware", {
    headers: { "x-apikey": apiKey },
  });

  if (!data || !data.flights || data.flights.length === 0) {
    return null;
  }

  const selected = selectFlight(data.flights);
  if (!selected) {
    return null;
  }

  return {
    estimatedOn: selected.estimated_on ?? null,
    estimatedIn: selected.estimated_in ?? null,
    status: selected.status ?? null,
    diverted: selected.diverted ?? false,
    progressPercent: selected.progress_percent ?? null,
    gateDestination: selected.gate_destination ?? null,
    terminalDestination: selected.terminal_destination ?? null,
    baggageClaim: selected.baggage_claim ?? null,
  };
}
