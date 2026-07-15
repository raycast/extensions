import { Cache } from "@raycast/api";
import { REGION_STATUS_URL, REGION_INFORMATION_URL } from "./constants";
import type { Region } from "./constants";

const cache = new Cache();

// Define interfaces for API responses
export interface StationStatus {
  station_id: string;
  num_bikes_available: number;
  num_ebikes_available: number;
  num_docks_available: number;
  is_renting: number;
  last_reported: number;
}

export interface StationInfo {
  station_id: string;
  name: string;
  address?: string;
  lat?: number;
  lon?: number;
  capacity?: number;
  rental_uris?: {
    android?: string;
    ios?: string;
  };
}

export interface Station extends StationStatus, StationInfo {
  num_classic_bikes_available: number;
}

interface StationStatusResponse {
  data: {
    stations: StationStatus[];
  };
}

interface StationInformationResponse {
  data: {
    stations: StationInfo[];
  };
}

// Function to fetch station status for a specific region
export async function getStationStatus(region: Region): Promise<StationStatus[]> {
  const cacheKey = `station-status-${region}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const url = REGION_STATUS_URL(region);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch station status for region ${region}: ${response.statusText}`);
  }

  const data = (await response.json()) as StationStatusResponse;

  if (!data.data?.stations) {
    throw new Error("Invalid response structure for station status.");
  }

  // Cache the result
  cache.set(cacheKey, JSON.stringify(data.data.stations));

  return data.data.stations;
}

// Function to fetch station information for a specific region
export async function getStationInformation(region: Region): Promise<StationInfo[]> {
  const cacheKey = `station-info-${region}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const url = REGION_INFORMATION_URL(region);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch station information for region ${region}: ${response.statusText}`);
  }

  const data = (await response.json()) as StationInformationResponse;

  if (!data.data?.stations) {
    throw new Error("Invalid response structure for station information.");
  }

  // Cache the result
  cache.set(cacheKey, JSON.stringify(data.data.stations));

  return data.data.stations;
}
