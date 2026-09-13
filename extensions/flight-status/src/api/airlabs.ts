import { FlightRoute, FlightSchedule } from "../types";
import { fetchJson } from "./http";
import { timezoneForAirport } from "../data/airport-timezones";

const AIRLABS_BASE_URL = "https://airlabs.co/api/v9";

interface AirlabsFlightResponse {
  response: Array<{
    hex: string;
    flight_icao: string;
    flight_iata: string;
    dep_icao: string;
    dep_iata: string;
    arr_icao: string;
    arr_iata: string;
  }>;
}

interface AirlabsAirportResponse {
  response: Array<{
    iata_code: string;
    lat: number;
    lng: number;
  }>;
}

/**
 * Fetch airport coordinates by IATA code from Airlabs.
 *
 * (Airlabs' airports endpoint doesn't return a timezone, so the arrival
 * timezone is resolved separately from a bundled IATA->tz table.)
 */
async function fetchAirportCoords(
  iataCode: string,
  apiKey: string,
): Promise<{ lat: number; lng: number } | null> {
  const url = `${AIRLABS_BASE_URL}/airports?iata_code=${iataCode}&api_key=${apiKey}&_fields=iata_code,lat,lng`;
  const data = await fetchJson<AirlabsAirportResponse>(url, "Airlabs airports");

  if (!data || !data.response || data.response.length === 0) {
    return null;
  }

  const { lat, lng } = data.response[0];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.error(`Airlabs airports: missing coordinates for ${iataCode}`);
    return null;
  }

  return { lat, lng };
}

/** Schedule statuses that mean the leg is over (not the current flight). */
function isCompletedStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes("landed") || s.includes("arrived") || s.includes("cancel");
}

/**
 * Build a FlightRoute by fetching coordinates for the given airports.
 * `hex` is the ICAO24 (empty string when unknown, e.g. from the schedule
 * fallback — telemetry then comes from ADSB.lol by callsign, not OpenSky).
 */
async function buildRoute(
  hex: string,
  depIata: string,
  depIcao: string,
  arrIata: string,
  arrIcao: string,
  apiKey: string,
): Promise<FlightRoute | null> {
  const [depCoords, arrCoords] = await Promise.all([
    fetchAirportCoords(depIata, apiKey),
    fetchAirportCoords(arrIata, apiKey),
  ]);

  if (!depCoords || !arrCoords) {
    console.error("Failed to fetch airport coordinates");
    return null;
  }

  return {
    hex,
    depIata,
    depIcao,
    arrIata,
    arrIcao,
    depLat: depCoords.lat,
    depLng: depCoords.lng,
    arrLat: arrCoords.lat,
    arrLng: arrCoords.lng,
    arrTz: timezoneForAirport(arrIata),
  };
}

/**
 * Fetch the flight route (departure/arrival airports + ICAO24 hex) for a
 * callsign.
 *
 * 1. The live `/flights` endpoint is preferred — it includes the `hex` needed
 *    to query OpenSky.
 * 2. When `/flights` has no result (the flight isn't currently ADS-B tracked by
 *    Airlabs), fall back to `/schedules`, which still knows the route airports.
 *    That route carries no hex, so telemetry comes from the ADSB.lol callsign
 *    lookup instead of OpenSky.
 *
 * Returns null if neither endpoint has the flight.
 */
export async function fetchFlightRoute(
  flightIcao: string,
  apiKey: string,
): Promise<FlightRoute | null> {
  // Primary: live flights (has the ICAO24 hex)
  const flightUrl = `${AIRLABS_BASE_URL}/flights?flight_icao=${flightIcao}&api_key=${apiKey}`;
  const flightData = await fetchJson<AirlabsFlightResponse>(
    flightUrl,
    "Airlabs flights",
  );
  const flight = flightData?.response?.[0];
  if (flight) {
    return buildRoute(
      flight.hex,
      flight.dep_iata,
      flight.dep_icao,
      flight.arr_iata,
      flight.arr_icao,
      apiKey,
    );
  }

  // Fallback: schedules (no hex → ADSB.lol provides telemetry by callsign)
  const scheduleUrl = `${AIRLABS_BASE_URL}/schedules?flight_icao=${flightIcao}&api_key=${apiKey}`;
  const scheduleData = await fetchJson<AirlabsScheduleResponse>(
    scheduleUrl,
    "Airlabs schedules",
  );
  const legs = (scheduleData?.response ?? []).filter((s) => s.arr_iata);
  const leg = legs.find((s) => !isCompletedStatus(s.status)) ?? legs[0];
  if (!leg || !leg.arr_iata) {
    return null;
  }

  return buildRoute(
    "",
    leg.dep_iata,
    leg.dep_icao ?? "",
    leg.arr_iata,
    leg.arr_icao ?? "",
    apiKey,
  );
}

interface AirlabsScheduleResponse {
  response: Array<{
    dep_iata: string;
    dep_icao?: string;
    arr_iata?: string;
    arr_icao?: string;
    arr_time_ts: number;
    arr_estimated_ts?: number;
    duration: number;
    status: string;
    dep_gate: string | null;
    arr_gate: string | null;
    arr_terminal: string | null;
    arr_baggage: string | null;
    arr_delayed: number | null;
  }>;
}

/**
 * Fetch schedule data for a flight from Airlabs.
 *
 * The schedules endpoint may return multiple legs for the same flight number.
 * We match by departure airport (depIata) to select the correct leg.
 *
 * Returns null if the schedule is not found.
 */
export async function fetchFlightSchedule(
  flightIcao: string,
  apiKey: string,
  depIata: string,
): Promise<FlightSchedule | null> {
  const url = `${AIRLABS_BASE_URL}/schedules?flight_icao=${flightIcao}&api_key=${apiKey}`;
  const data = await fetchJson<AirlabsScheduleResponse>(
    url,
    "Airlabs schedules",
  );

  if (!data || !data.response || data.response.length === 0) {
    return null;
  }

  // Match by departure airport (flight numbers can have multiple legs)
  const leg =
    data.response.find((s) => s.dep_iata === depIata) ?? data.response[0];

  return {
    arrTimeTs: leg.arr_time_ts,
    arrEstimatedTs: leg.arr_estimated_ts ?? null,
    duration: leg.duration,
    status: leg.status,
    depGate: leg.dep_gate,
    arrGate: leg.arr_gate,
    arrTerminal: leg.arr_terminal,
    arrBaggage: leg.arr_baggage,
    arrDelayed: leg.arr_delayed ?? null,
  };
}
