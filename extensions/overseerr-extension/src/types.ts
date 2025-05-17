export interface RequestedBy {
  id: number;
  plexUsername: string;
}

export interface Media {
  id: number;
  tmdbId: number;
  mediaType: "movie" | "tv";
  status: number;
}

export interface OverseerrRequest {
  id: number;
  status: number;
  requestedBy: RequestedBy;
  media: Media;
}

export interface QualityProfile {
  id: number;
  name: string;
  items: unknown[];
  upgradeAllowed?: boolean;
}

export interface ServerConfig {
  id: number;
  name: string;
  activeProfileId: number;
  activeProfileName: string;
  activeDirectory: string;
}
