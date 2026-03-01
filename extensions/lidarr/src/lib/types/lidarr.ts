export interface Image {
  coverType: string;
  url?: string;
  remoteUrl?: string;
}

export interface Ratings {
  value?: number;
  votes?: number;
}

export interface ArtistStatistics {
  albumCount: number;
  trackFileCount: number;
  trackCount: number;
  percentOfTracks: number;
  sizeOnDisk?: number;
}

export interface Artist {
  id: number;
  artistName: string;
  sortName: string;
  status?: string;
  ended?: boolean;
  monitored: boolean;
  overview?: string;
  genres?: string[];
  path?: string;
  images: Image[];
  links?: Array<{ name: string; url: string }>;
  ratings?: Ratings;
  statistics?: ArtistStatistics;
  qualityProfileId?: number;
  metadataProfileId?: number;
  rootFolderPath?: string;
  foreignArtistId?: string;
}

export interface Album {
  id: number;
  title: string;
  monitored?: boolean;
  albumType?: string;
  releaseDate?: string;
  images?: Image[];
  foreignAlbumId?: string;
  statistics?: {
    trackCount?: number;
    trackFileCount?: number;
  };
}

export interface Release {
  guid?: string;
  indexerId?: number;
  title: string;
  protocol?: string;
  indexer?: string;
  size?: number;
  age?: number;
  publishDate?: string;
  seeders?: number;
  leechers?: number;
  releaseWeight?: number;
  rejected?: boolean;
  rejections?: string[];
  quality?: {
    quality?: {
      name?: string;
      title?: string;
    };
  };
  [key: string]: unknown;
}

export interface ArtistLookup extends Artist {
  remotePoster?: string;
  albums?: Album[];
}

export interface RootFolder {
  id: number;
  path: string;
}

export interface QualityProfile {
  id: number;
  name: string;
}

export interface MetadataProfile {
  id: number;
  name: string;
  primaryAlbumTypes?: string[];
  secondaryAlbumTypes?: string[];
  releaseStatuses?: string[];
}

export interface AddArtistOptions {
  artistName: string;
  foreignArtistId?: string;
  qualityProfileId: number;
  metadataProfileId: number;
  monitored: boolean;
  rootFolderPath: string;
  addOptions: {
    monitor: "all" | "future" | "missing" | "none";
    searchForMissingAlbums: boolean;
  };
}

export interface QueueStatusMessage {
  title: string;
  messages: string[];
}

export interface QueueItem {
  id: number;
  title: string;
  status: string;
  trackedDownloadStatus?: string;
  size: number;
  sizeleft: number;
  timeleft?: string;
  protocol: string;
  downloadClient: string;
  indexer: string;
  errorMessage?: string;
  statusMessages?: QueueStatusMessage[];
  artist?: Artist;
  album?: Album;
}

export interface HistoryRecord {
  id: number;
  date: string;
  eventType: string;
  sourceTitle?: string;
  data?: Record<string, string | number | boolean | undefined>;
  artist?: Artist;
  album?: Album;
}

export interface HistoryResponse {
  records: HistoryRecord[];
}

export interface QueueResponse {
  records: QueueItem[];
}

export interface SystemStatus {
  version: string;
  osName?: string;
  [key: string]: unknown;
}

export interface HealthCheck {
  source: string;
  type: "ok" | "notice" | "warning" | "error";
  message: string;
  wikiUrl?: string;
}

export interface Command {
  id: number;
  status?: string;
  [key: string]: unknown;
}
