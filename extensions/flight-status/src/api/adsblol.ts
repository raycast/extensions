import { OpenSkyState } from "../types";
import { feetToMeters, knotsToMs, ftPerMinToMs } from "../utils/units";
import { fetchJson } from "./http";

const ADSBLOL_BASE_URL = "https://api.adsb.lol/v2/callsign";
// Below this ground speed (knots), an aircraft with no altitude reading is
// taxiing/parked rather than flying; airborne ground speeds are far higher.
const GROUND_SPEED_THRESHOLD_KNOTS = 30;

/** Raw aircraft object from ADSB.lol API */
interface AdsbLolAircraft {
  hex: string;
  flight?: string;
  r?: string;
  t?: string;
  alt_baro?: number | "ground";
  alt_geom?: number;
  gs?: number;
  track?: number;
  baro_rate?: number;
  lat?: number;
  lon?: number;
  seen?: number;
  seen_pos?: number;
}

interface AdsbLolResponse {
  ac: AdsbLolAircraft[] | null;
  total: number;
}

/**
 * Fetch the current state for an aircraft by callsign from ADSB.lol.
 * Returns data in the same OpenSkyState format (meters, m/s) for compatibility.
 * Returns null if the aircraft is not found or on error.
 */
export async function fetchFlightStateByCallsign(
  callsign: string,
): Promise<OpenSkyState | null> {
  const url = `${ADSBLOL_BASE_URL}/${callsign}`;
  const data = await fetchJson<AdsbLolResponse>(url, "ADSB.lol");

  if (!data || !data.ac || data.ac.length === 0) {
    return null;
  }

  const ac = data.ac[0];
  // ADSB.lol reports the literal "ground" for grounded aircraft. When alt_baro
  // is absent (position-only record) we infer the ground state from a very low
  // ground speed, so a parked/taxiing aircraft isn't defaulted to airborne.
  const onGround =
    ac.alt_baro === "ground" ||
    (ac.alt_baro == null &&
      ac.gs != null &&
      ac.gs < GROUND_SPEED_THRESHOLD_KNOTS);
  // Only treat alt_baro as an altitude when it's actually numeric; an off-spec
  // string (anything other than "ground") must not become a NaN altitude.
  const baroAltitude = onGround
    ? 0
    : typeof ac.alt_baro === "number"
      ? feetToMeters(ac.alt_baro)
      : null;

  return {
    icao24: ac.hex,
    callsign: ac.flight?.trim() ?? callsign,
    originCountry: "",
    timePosition:
      ac.seen_pos != null ? Math.floor(Date.now() / 1000) - ac.seen_pos : null,
    lastContact:
      ac.seen != null
        ? Math.floor(Date.now() / 1000) - ac.seen
        : Math.floor(Date.now() / 1000),
    longitude: ac.lon ?? null,
    latitude: ac.lat ?? null,
    baroAltitude,
    onGround,
    velocity: ac.gs != null ? knotsToMs(ac.gs) : null,
    trueTrack: ac.track ?? null,
    verticalRate: ac.baro_rate != null ? ftPerMinToMs(ac.baro_rate) : null,
    geoAltitude: ac.alt_geom != null ? feetToMeters(ac.alt_geom) : null,
  };
}
