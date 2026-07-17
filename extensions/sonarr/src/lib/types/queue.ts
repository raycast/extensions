import type { Language, EpisodeFileQuality } from "./episode";
import type { SeriesFull } from "./series";

export interface QueueItem {
  seriesId: number;
  episodeId: number;
  language: Language;
  quality: EpisodeFileQuality;
  size: number;
  title: string;
  sizeleft: number;
  timeleft: string;
  estimatedCompletionTime: string;
  status: string;
  trackedDownloadStatus: string;
  trackedDownloadState: string;
  statusMessages: StatusMessage[];
  errorMessage?: string;
  downloadId: string;
  protocol: string;
  downloadClient: string;
  indexer: string;
  outputPath: string;
  downloadForced: boolean;
  series?: SeriesFull;
  episode?: QueueEpisode;
  id: number;
}

export interface QueueEpisode {
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

export interface StatusMessage {
  title: string;
  messages: string[];
}
