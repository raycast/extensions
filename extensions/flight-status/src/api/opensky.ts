import { OpenSkyState } from "../types";
import { fetchJson } from "./http";

const OPENSKY_BASE_URL = "https://opensky-network.org/api/states/all";

interface OpenSkyResponse {
  time: number;
  states: (string | number | boolean | number[] | null)[][] | null;
}

/**
 * Parse a raw state vector array from OpenSky into a typed object.
 * See: https://openskynetwork.github.io/opensky-api/rest.html#all-state-vectors
 */
function parseStateVector(
  raw: (string | number | boolean | number[] | null)[],
): OpenSkyState {
  return {
    icao24: raw[0] as string,
    // OpenSky allows a null callsign when the aircraft isn't broadcasting one.
    callsign: (raw[1] as string | null)?.trim() ?? "",
    originCountry: raw[2] as string,
    timePosition: raw[3] as number | null,
    lastContact: raw[4] as number,
    longitude: raw[5] as number | null,
    latitude: raw[6] as number | null,
    baroAltitude: raw[7] as number | null,
    onGround: raw[8] as boolean,
    velocity: raw[9] as number | null,
    trueTrack: raw[10] as number | null,
    verticalRate: raw[11] as number | null,
    geoAltitude: raw[13] as number | null,
  };
}

/**
 * Fetch the current state vector for an aircraft by its ICAO24 hex address.
 * Returns null if the aircraft is not currently tracked by OpenSky.
 */
export async function fetchFlightState(
  icao24: string,
): Promise<OpenSkyState | null> {
  const url = `${OPENSKY_BASE_URL}?icao24=${icao24.toLowerCase()}`;
  const data = await fetchJson<OpenSkyResponse>(url, "OpenSky");

  if (!data || !data.states || data.states.length === 0) {
    return null;
  }

  return parseStateVector(data.states[0]);
}
