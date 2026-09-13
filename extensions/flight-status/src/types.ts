/** State vector from OpenSky Network API */
export interface OpenSkyState {
  /** ICAO24 transponder address (hex) */
  icao24: string;
  /** Callsign (may have trailing spaces) */
  callsign: string;
  /** Country of origin */
  originCountry: string;
  /** Unix timestamp of last position update */
  timePosition: number | null;
  /** Unix timestamp of last contact */
  lastContact: number;
  /** Longitude in degrees (WGS-84) */
  longitude: number | null;
  /** Latitude in degrees (WGS-84) */
  latitude: number | null;
  /** Barometric altitude in meters */
  baroAltitude: number | null;
  /** Whether the aircraft is on the ground */
  onGround: boolean;
  /** Ground speed in m/s */
  velocity: number | null;
  /** True track / heading in degrees (0-360) */
  trueTrack: number | null;
  /** Vertical rate in m/s */
  verticalRate: number | null;
  /** Geometric altitude in meters */
  geoAltitude: number | null;
}

/** Flight route information from Airlabs API */
export interface FlightRoute {
  /** ICAO24 transponder hex address */
  hex: string;
  /** Departure airport IATA code */
  depIata: string;
  /** Departure airport ICAO code */
  depIcao: string;
  /** Arrival airport IATA code */
  arrIata: string;
  /** Arrival airport ICAO code */
  arrIcao: string;
  /** Departure airport latitude */
  depLat: number;
  /** Departure airport longitude */
  depLng: number;
  /** Arrival airport latitude */
  arrLat: number;
  /** Arrival airport longitude */
  arrLng: number;
  /** Arrival airport IANA timezone (e.g. "America/New_York"), if known */
  arrTz: string | null;
}

/** Flight schedule information from Airlabs schedules API */
export interface FlightSchedule {
  /** Scheduled arrival UNIX timestamp */
  arrTimeTs: number;
  /** Updated estimated arrival UNIX timestamp (may be unreliable) */
  arrEstimatedTs: number | null;
  /** Estimated flight duration in minutes */
  duration: number;
  /** Flight status from the airline (e.g., "active", "scheduled", "landed") */
  status: string;
  /** Departure gate */
  depGate: string | null;
  /** Arrival gate */
  arrGate: string | null;
  /** Arrival terminal */
  arrTerminal: string | null;
  /** Arrival baggage carousel */
  arrBaggage: string | null;
  /** Arrival delay in minutes (null if no delay info) */
  arrDelayed: number | null;
}

/** Flight status from FlightAware AeroAPI */
export interface FlightAwareStatus {
  /** Predicted landing time (ISO 8601) */
  estimatedOn: string | null;
  /** Predicted gate arrival time (ISO 8601) */
  estimatedIn: string | null;
  /** Flight status string (e.g., "En Route / On Time") */
  status: string | null;
  /** Whether the flight has been diverted */
  diverted: boolean;
  /** Flight progress percentage (0-100) */
  progressPercent: number | null;
  /** Destination gate */
  gateDestination: string | null;
  /** Destination terminal */
  terminalDestination: string | null;
  /** Baggage claim */
  baggageClaim: string | null;
}

/** Derived flight phase from telemetry */
export enum FlightPhase {
  OnGround = "On Ground",
  Climbing = "Climbing",
  Cruising = "Cruising",
  Descending = "Descending",
  Landed = "Landed",
}

/** Which icon to show in the menu bar */
export type MenuBarIconChoice = "airline" | "app" | "none";

/** Extension preferences */
export interface Preferences {
  /** Airlabs API key */
  airlabsApiKey: string;
  /** FlightAware AeroAPI key (optional) */
  flightAwareApiKey?: string;
  /** Keep menu bar item visible when flight is not active */
  alwaysShow: boolean;
  /** Which icon to show in the menu bar (airline logo, app icon, or none) */
  menuBarIcon: MenuBarIconChoice;
  /** Show the flight number in the menu bar */
  showFlightNumber: boolean;
  /** Show the flight status in the menu bar */
  showStatus: boolean;
  /** Show the ETA in the menu bar */
  showEta: boolean;
}
