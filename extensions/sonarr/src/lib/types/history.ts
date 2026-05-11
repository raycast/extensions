import type { EpisodeFileQuality, Series } from "./episode";

export interface HistoryEpisode {
  id: number;
  seriesId: number;
  episodeFileId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDate: string;
  airDateUtc: string;
  overview?: string;
  hasFile: boolean;
  monitored: boolean;
  absoluteEpisodeNumber?: number;
  unverifiedSceneNumbering: boolean;
}

export interface HistoryRecord {
  id: number;
  seriesId: number;
  episodeId: number;
  series?: Series;
  episode?: HistoryEpisode;
  sourceTitle: string;
  quality: EpisodeFileQuality;
  qualityCutoffNotMet: boolean;
  eventType: string;
  date: string;
  downloadId?: string;
  data?: {
    indexer?: string;
    downloadClient?: string;
    downloadClientName?: string;
    downloadUrl?: string;
    nzbInfoUrl?: string;
    torrentInfoHash?: string;
    releaseGroup?: string;
  };
}

export interface HistoryResponse {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDirection: string;
  totalRecords: number;
  records: HistoryRecord[];
}
