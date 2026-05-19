import { Color } from "@raycast/api";

export interface SteamApp {
  id: number;
  name: string;
  tiny_image: string;
}

export interface SteamSearchResponse {
  total: number;
  items: SteamApp[];
}

export interface AppDetails {
  price: string;
  ggPrice: string | null;
  rating: string;
  ratingColor: Color;
  currentPlayers: string;
  peakToday: string | null;
  peakAllTime: string | null;
  iconUrl: string | null;
}

export interface PersistedDetails {
  details: AppDetails;
  timestamp: number;
}
