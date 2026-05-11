import { DeparturesQuery, QuayDepartures } from "./api/departuresQuery";
import { Quay } from "./api/fragments";

export type QuayLineFavorites = {
  stopPlaceId: string;
  quayId: string;
  lineIds: string[];
};

export type StopPlaceQuayDeparturesQuery = {
  stopPlace?: DeparturesQuery;
  favorites: QuayDepartures[];
};

export type DirectionType = "unknown" | "outbound" | "inbound" | "clockwise" | "anticlockwise";

export enum TransportMode {
  Air = "air",
  Bus = "bus",
  Cableway = "cableway",
  Coach = "coach",
  Funicular = "funicular",
  Lift = "lift",
  Metro = "metro",
  Monorail = "monorail",
  Rail = "rail",
  Tram = "tram",
  Trolleybus = "trolleybus",
  Unknown = "unknown",
  Water = "water",
  Foot = "foot",
}

export type DestinationDisplay = {
  frontText?: string;
  via?: string[];
};

export type SjEstimatedCall = {
  quay: {
    id: string;
    name: string;
    publicCode?: string;
  };
  aimedDepartureTime: string;
  expectedDepartureTime: string | null;
};

export type StopPlace = {
  name: string;
  transportMode?: Array<TransportMode>;
  description?: string;
  id: string;
  latitude?: number;
  longitude?: number;
  quays?: Quay[];
};

export type Feature = {
  properties: {
    id: string;
    name: string;
    label: string; // name, locality
    locality?: string; // kommune
    county?: string; // fylke
    category: VenueCategory[];
  };
  geometry: {
    coordinates: [number, number];
  };
};

export type VenueCategory =
  | "onstreetBus"
  | "onstreetTram"
  | "airport"
  | "railStation"
  | "metroStation"
  | "busStation"
  | "coachStation"
  | "tramStation"
  | "harbourPort"
  | "ferryPort"
  | "ferryStop"
  | "liftStation"
  | "vehicleRailInterchange";
