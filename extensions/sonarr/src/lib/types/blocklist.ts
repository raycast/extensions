import type { Language, EpisodeFileQuality, Series } from "./episode";

export interface BlocklistRecord {
  id: number;
  seriesId: number;
  episodeIds: number[];
  sourceTitle: string;
  quality: EpisodeFileQuality;
  languages: Language[];
  protocol: string;
  indexer: string;
  downloadClient?: string;
  message?: string;
  date: string;
  series?: Series;
}

export interface BlocklistResponse {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDirection: string;
  totalRecords: number;
  records: BlocklistRecord[];
}
