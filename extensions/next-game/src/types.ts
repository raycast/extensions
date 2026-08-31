// src/types.ts
export interface AppStats {
  appId: number;
  playtime: number;
  lastPlayedAt: number | null;
  launchCount: number;
}

export interface EnrichmentData {
  name?: string;
  genres: string[];
  categories: string[];
  tags: string[];
}

export interface GameCache extends AppStats {
  name: string;
  genres?: string[];
  categories?: string[];
  tags?: string[];
  metacritic?: number;
  releaseDate?: number;
  developer?: string;
  isLocal?: boolean;
  enrichmentFailed?: boolean;
  priority?: number;
  genresUpdatedAt?: number;
  resolutionState: "resolved" | "resolving" | "unresolved" | "cache";
  isInstalled?: boolean;
}
