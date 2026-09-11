import { getPreferenceValues } from "@raycast/api";
import { StopFinderResponse, TransportMode } from "./types";

const API_BASE_URL = "https://api.transport.nsw.gov.au/v1/tp";

function getApiKey(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.apiKey;
}

async function fetchFromApi<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("API key is required. Please set your Transport NSW API key in the extension preferences.");
  }

  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/${endpoint}?${queryString}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `apikey ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your Transport NSW API key in the extension preferences.");
    }
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please wait a moment before trying again.");
    }
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function searchStops(query: string): Promise<StopFinderResponse> {
  if (!query || query.length < 2) {
    return { locations: [] };
  }

  const params: Record<string, string> = {
    outputFormat: "rapidJSON",
    coordOutputFormat: "EPSG:4326",
    type_sf: "any",
    name_sf: query,
    TfNSWSF: "true",
    anyMaxSizeHitList: "100",
  };

  return fetchFromApi<StopFinderResponse>("stop_finder", params);
}

export interface DepartureInfo {
  plannedTime: string;
  estimatedTime?: string;
  line: string;
  destination: string;
  platform?: string;
  delayMinutes: number;
  isRealtime: boolean;
}

export interface DeparturesResponse {
  stopEvents?: Array<{
    isRealtimeControlled?: boolean;
    departureTimeEstimated?: string;
    departureTimePlanned: string;
    transportation: {
      number: string;
      disassembledName?: string;
      product?: { class: number };
      destination: { name: string };
    };
    location: {
      properties?: { platform?: string };
    };
  }>;
}

export async function getDepartures(stopId: string): Promise<DepartureInfo[]> {
  const now = new Date();

  const params: Record<string, string> = {
    outputFormat: "rapidJSON",
    coordOutputFormat: "EPSG:4326",
    mode: "direct",
    type_dm: "stop",
    name_dm: stopId,
    depArrMacro: "dep",
    itdDate: formatDate(now),
    itdTime: formatTime(now),
    TfNSWDM: "true",
    // Only get train, metro, light rail
    exclMOT_5: "1", // Bus
    exclMOT_7: "1", // Coach
    exclMOT_9: "1", // Ferry
    exclMOT_11: "1", // School Bus
  };

  const response = await fetchFromApi<DeparturesResponse>("departure_mon", params);

  // Filter to rail only and transform to simpler format
  const allowedModes: number[] = [TransportMode.Train, TransportMode.Metro, TransportMode.LightRail];

  return (response.stopEvents || [])
    .filter((event) => {
      const mode = event.transportation.product?.class;
      return mode === undefined || allowedModes.includes(mode);
    })
    .map((event) => {
      const planned = new Date(event.departureTimePlanned);
      const estimated = event.departureTimeEstimated ? new Date(event.departureTimeEstimated) : null;
      const delayMinutes = estimated ? Math.round((estimated.getTime() - planned.getTime()) / 60000) : 0;

      return {
        plannedTime: event.departureTimePlanned,
        estimatedTime: event.departureTimeEstimated,
        line: event.transportation.disassembledName || event.transportation.number,
        destination: event.transportation.destination.name,
        platform: event.location.properties?.platform,
        delayMinutes,
        isRealtime: event.isRealtimeControlled || false,
      };
    });
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}${minutes}`;
}

export interface TripResponse {
  journeys?: Journey[];
}

export interface Journey {
  rating?: number;
  interchanges?: number;
  legs: Leg[];
}

export interface Leg {
  duration: number;
  isRealtimeControlled?: boolean;
  origin: LegLocation;
  destination: LegLocation;
  transportation?: LegTransportation;
  footPathInfo?: FootPathInfo[];
  stopSequence?: StopSequenceItem[];
}

export interface LegLocation {
  id: string;
  name: string;
  disassembledName?: string;
  type: string;
  departureTimePlanned?: string;
  departureTimeEstimated?: string;
  arrivalTimePlanned?: string;
  arrivalTimeEstimated?: string;
  parent?: {
    id: string;
    name: string;
    type: string;
  };
  properties?: {
    platform?: string;
    platformName?: string;
  };
}

export interface LegTransportation {
  id: string;
  name: string;
  disassembledName?: string;
  number?: string;
  description?: string;
  product?: {
    class: number;
    name: string;
  };
  destination?: {
    id: string;
    name: string;
  };
}

export interface FootPathInfo {
  position: string;
  duration: number;
}

export interface StopSequenceItem {
  id: string;
  name: string;
  disassembledName?: string;
  arrivalTimePlanned?: string;
  arrivalTimeEstimated?: string;
  departureTimePlanned?: string;
  departureTimeEstimated?: string;
  properties?: {
    platformName?: string;
  };
  parent?: {
    name: string;
    disassembledName?: string;
  };
}

async function fetchTripsForTime(
  originId: string,
  destinationId: string,
  dateTime: Date,
  isArrival: boolean,
): Promise<Journey[]> {
  const params: Record<string, string> = {
    outputFormat: "rapidJSON",
    coordOutputFormat: "EPSG:4326",
    depArrMacro: isArrival ? "arr" : "dep",
    type_origin: "stop",
    name_origin: originId,
    type_destination: "stop",
    name_destination: destinationId,
    itdDate: formatDate(dateTime),
    itdTime: formatTime(dateTime),
    TfNSWTR: "true",
    // Exclude non-rail modes: Bus (5), Coach (7), Ferry (9), School Bus (11)
    exclMOT_5: "1",
    exclMOT_7: "1",
    exclMOT_9: "1",
    exclMOT_11: "1",
    calcNumberOfTrips: "6",
  };

  const response = await fetchFromApi<TripResponse>("trip", params);
  return response.journeys || [];
}

export async function planTrip(
  originId: string,
  destinationId: string,
  options?: {
    dateTime?: Date;
    isArrival?: boolean;
    quick?: boolean; // For menu bar - single API call
  },
): Promise<TripResponse> {
  const baseTime = options?.dateTime || new Date();
  const isArrival = options?.isArrival || false;

  // Quick mode for menu bar - single API call to avoid rate limits
  if (options?.quick) {
    const journeys = await fetchTripsForTime(originId, destinationId, baseTime, isArrival);
    return { journeys };
  }

  // Full mode - fetch trips at multiple time offsets for more results
  const timeOffsets = [0, 30, 60, 90]; // minutes
  const requests = timeOffsets.map((offset) => {
    const time = new Date(baseTime.getTime() + offset * 60000);
    return fetchTripsForTime(originId, destinationId, time, isArrival);
  });

  const results = await Promise.all(requests);
  const allJourneys = results.flat();

  // Deduplicate by departure time (keep first occurrence)
  const seen = new Set<string>();
  const uniqueJourneys = allJourneys.filter((journey) => {
    const departTime = journey.legs[0]?.origin.departureTimePlanned || "";
    if (seen.has(departTime)) return false;
    seen.add(departTime);
    return true;
  });

  return { journeys: uniqueJourneys };
}
