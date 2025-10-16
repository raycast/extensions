export interface RadarrInstance {
  name: string;
  url: string;
  apiKey: string;
  isDefault: boolean;
}

export interface Movie {
  id: number;
  title: string;
  originalTitle: string;
  sortTitle: string;
  overview: string;
  inCinemas?: string;
  digitalRelease?: string;
  physicalRelease?: string;
  year: number;
  tmdbId: number;
  imdbId?: string;
  runtime: number;
  genres: string[];
  status: "announced" | "inCinemas" | "released" | "deleted";
  monitored: boolean;
  hasFile: boolean;
  downloaded: boolean;
  movieFile?: MovieFile;
  qualityProfileId: number;
  rootFolderPath: string;
  folder?: string;
  images: MovieImage[];
  ratings?: {
    imdb?: { value: number; votes: number };
    tmdb?: { value: number; votes: number };
    rottenTomatoes?: { value: number };
  };
}

export interface MovieFile {
  id: number;
  movieId: number;
  relativePath: string;
  path: string;
  size: number;
  dateAdded: string;
  quality: Quality;
  mediaInfo?: MediaInfo;
}

export interface Quality {
  quality: {
    id: number;
    name: string;
    source: string;
    resolution: string;
  };
  revision: {
    version: number;
    real: number;
  };
}

export interface MediaInfo {
  containerFormat: string;
  videoFormat: string;
  videoCodecID: string;
  videoBitrate: number;
  videoBitDepth: number;
  videoMultiViewCount: number;
  videoColourPrimaries: string;
  videoTransferCharacteristics: string;
  width: number;
  height: number;
  audioFormat: string;
  audioBitrate: number;
  runTime: string;
  audioStreamCount: number;
  audioChannels: number;
  audioChannelPositions: string;
  audioChannelPositionsText: string;
  audioProfile: string;
  videoFps: number;
  audioLanguages: string;
  subtitles: string;
  scanType: string;
  schemaRevision: number;
}

export interface MovieImage {
  coverType: "poster" | "banner" | "fanart" | "screenshot" | "headshot";
  url: string;
  remoteUrl: string;
}

export interface QueueItem {
  id: number;
  movieId: number;
  movie: Movie;
  size: number;
  title: string;
  sizeleft: number;
  status: string;
  trackedDownloadStatus: "ok" | "warning" | "error";
  trackedDownloadState:
    | "downloading"
    | "downloadFailed"
    | "downloadFailedPending"
    | "importPending"
    | "importing"
    | "imported"
    | "failedPending"
    | "failed"
    | "ignored";
  statusMessages: Array<{
    title: string;
    messages: string[];
  }>;
  downloadId: string;
  protocol: "unknown" | "usenet" | "torrent";
  downloadClient: string;
  indexer: string;
  outputPath: string;
  timeleft?: string;
  estimatedCompletionTime?: string;
}

export interface CalendarMovie extends Movie {
  inCinemas?: string;
  digitalRelease?: string;
  physicalRelease?: string;
}

export interface HealthCheck {
  source: string;
  type: "ok" | "notice" | "warning" | "error";
  message: string;
  wikiUrl?: string;
}

export interface SystemStatus {
  version: string;
  buildTime: string;
  isDebug: boolean;
  isProduction: boolean;
  isAdmin: boolean;
  isUserInteractive: boolean;
  startupPath: string;
  appData: string;
  osName: string;
  osVersion: string;
  isMonoRuntime: boolean;
  isMono: boolean;
  isLinux: boolean;
  isOsx: boolean;
  isWindows: boolean;
  mode: string;
  branch: string;
  authentication: string;
  sqliteVersion: string;
  urlBase?: string;
  runtimeVersion: string;
  runtimeName: string;
  migrationVersion: number;
}

export interface HistoryRecord {
  id: number;
  movieId: number;
  movie: Movie;
  eventType: "grabbed" | "movieFolderImported" | "downloadFolderImported" | "movieFileDeleted" | "movieFileRenamed";
  sourceTitle: string;
  quality: Quality;
  qualityCutoffNotMet: boolean;
  date: string;
  downloadId?: string;
  data?: Record<string, unknown>;
}

export interface MovieLookup {
  title: string;
  originalTitle: string;
  sortTitle: string;
  status: string;
  overview: string;
  inCinemas?: string;
  images: MovieImage[];
  website?: string;
  year: number;
  youtubeTrailerId?: string;
  studio?: string;
  runtime: number;
  imdbId?: string;
  tmdbId: number;
  genres: string[];
  ratings?: {
    imdb?: { value: number; votes: number };
    tmdb?: { value: number; votes: number };
    rottenTomatoes?: { value: number };
  };
  certification?: string;
  collection?: {
    name: string;
    tmdbId: number;
    images: MovieImage[];
  };
  remotePoster?: string;
  added?: boolean;
  folder?: string;
}

export interface AddMovieOptions {
  title: string;
  qualityProfileId: number;
  rootFolderPath: string;
  monitored: boolean;
  tmdbId: number;
  year: number;
  addOptions: {
    searchForMovie: boolean;
  };
}
