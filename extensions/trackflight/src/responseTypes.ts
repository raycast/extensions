export enum FlightStatus {
  Unknown = "Unknown",
  Expected = "Expected",
  EnRoute = "EnRoute",
  CheckIn = "CheckIn",
  Boarding = "Boarding",
  GateClosed = "GateClosed",
  Departed = "Departed",
  Delayed = "Delayed",
  Approaching = "Approaching",
  Arrived = "Arrived",
  Canceled = "Canceled",
  Diverted = "Diverted",
  CanceledUncertain = "CanceledUncertain",
}

export enum CodeShareStatus {
  Unknown = "Unknown",
  IsOperator = "IsOperator",
  IsCodeshared = "IsCodeshared",
}

/**
 * @enum
 * Array of quality characteristics of the data.
 * Check this to know which information you can expect within
 * this contract (basic, live and/or approximate data).
 */
export const FlightAirportMovementQuality = {
  Basic: "Basic",
  Live: "Live",
  Approximate: "Approximate",
} as const;

interface GreatCircleDistance {
  meter: number;
  km: number;
  mile: number;
  nm: number;
  feet: number;
}

export interface Location {
  lat: number;
  lon: number;
}

interface Airport {
  icao?: string;
  iata?: string;
  localCode?: string;
  name: string;
  shortName?: string;
  municipalityName?: string;
  location?: Location;
  countryCode?: string;
}

interface Image {
  url: string;
  webUrl: string;
  author: string;
  title: string;
  description: string;
  license: string;
  htmlAttributions: string[];
}

interface Aircraft {
  reg?: string;
  modeS?: string;
  model?: string;
  image?: Image;
}

interface Airline {
  name: string;
}

export interface Arrival {
  airport: Airport;
  scheduledTimeLocal?: string;
  actualTimeLocal?: string;
  runwayTimeLocal?: string;
  scheduledTimeUtc?: string;
  actualTimeUtc?: string;
  runwayTimeUtc?: string;
  terminal?: string;
  checkInDesk?: string;
  gate?: string;
  baggageBelt?: string;
  runway?: string;
  quality: (typeof FlightAirportMovementQuality)[] | string[];
}

export interface Departure {
  airport: Airport;
  scheduledTimeLocal?: string;
  actualTimeLocal?: string;
  runwayTimeLocal?: string;
  scheduledTimeUtc?: string;
  actualTimeUtc?: string;
  runwayTimeUtc?: string;
  terminal?: string;
  checkInDesk?: string;
  gate?: string;
  baggageBelt?: string;
  runway?: string;
  quality: (typeof FlightAirportMovementQuality)[] | string[];
}

export interface Flight {
  greatCircleDistance?: GreatCircleDistance;
  departure: Departure;
  arrival: Arrival;
  lastUpdatedUtc: string;
  number: string;
  callSign?: string;
  status: FlightStatus;
  codeshareStatus: CodeShareStatus;
  isCargo: boolean;
  aircraft?: Aircraft;
  airline?: Airline;
  location?: Location;
}

export interface ErrorResponse {
  message: string;
}
