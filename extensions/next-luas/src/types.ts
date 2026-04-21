export type LuasLine = "Red" | "Green";

export interface Stop {
  abv: string;
  name: string;
  lat: number;
  lng: number;
  line: LuasLine;
  parkRide: boolean;
  cycleRide: boolean;
}

export interface StopWithDistance extends Stop {
  distanceMeters: number;
}

export interface Tram {
  dueMins: string; // "DUE", "1", ..., or "" when none
  destination: string;
}

export interface Forecast {
  stopName: string;
  stopAbv: string;
  created: string;
  message: string;
  inbound: Tram[];
  outbound: Tram[];
}

export interface Coords {
  lat: number;
  lng: number;
}

export type LocationSource = "manual" | "corelocation" | "ip";

export interface ResolvedLocation {
  coords: Coords;
  source: LocationSource;
  warning?: string;
}
