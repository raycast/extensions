import { Application } from "@raycast/api";

export type MediaType = "movie" | "series";

export interface Preferences {
  baseUrl: string;
  alternativeStreamingApps: string;
  defaultStreamingApp: Application;
}

export interface Media {
  id: string;
  imdb_id: string;
  type: MediaType;
  name: string;
  releaseInfo: string;
  poster: string;
  defaultVideoId?: string;
}

export interface Stream {
  title: string;
  url: string;
  behaviorHints?: {
    bingeGroup?: string;
    filename?: string;
  };
}

export interface StreamLike extends Stream {
  description?: string;
  name?: string;
}

export interface Episode {
  id: string;
  name: string;
  season: number;
  number: number;
  releaseInfo: string;
  description?: string;
  thumbnail?: string;
}

export interface RecentMedia extends Media {
  lastAccessedAt: string;
  lastSelectedSeason?: number;
  lastSelectedEpisode?: string;
}

export interface WatchedEpisode {
  episodeId: string;
  watchedAt: string;
  seriesId: string;
  season: number;
  episode: number;
}

export interface SeriesDetailResponse {
  meta: {
    imdb_id: string;
    name: string;
    poster: string;
    background?: string;
    releaseInfo: string;
    videos: {
      name: string;
      season: number;
      number: number;
      firstAired: string;
      id: string;
      description?: string;
      thumbnail?: string;
    }[];
  };
}

export interface SearchResponse {
  query: string;
  rank: number;
  cacheMaxAge: number;
  metas: {
    id: string;
    imdb_id: string;
    type: string;
    name: string;
    releaseInfo: string;
    poster: string;
    links: string[];
    behaviorHints: {
      defaultVideoId?: string;
      hasScheduledVideos: boolean;
    };
  }[];
}

export interface StreamResponse {
  streams: StreamLike[];
}
