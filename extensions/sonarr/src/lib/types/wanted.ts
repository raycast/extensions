import type { Series, EpisodeFile } from "./episode";

export interface WantedMissingEpisode {
  id: number;
  seriesId: number;
  episodeFileId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDate: string;
  airDateUtc: string;
  overview?: string;
  episodeFile?: EpisodeFile;
  hasFile: boolean;
  monitored: boolean;
  absoluteEpisodeNumber?: number;
  unverifiedSceneNumbering: boolean;
  series?: Series;
  lastSearchTime?: string;
}

export interface WantedMissingResponse {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDirection: string;
  totalRecords: number;
  records: WantedMissingEpisode[];
}
