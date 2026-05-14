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

export interface CalendarMovie extends Movie {
  inCinemas?: string;
  digitalRelease?: string;
  physicalRelease?: string;
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
