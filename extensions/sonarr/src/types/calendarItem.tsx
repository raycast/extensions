export interface SingleSeries {
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
  series: Series;
  lastSearchTime?: string;
  id: number;
}

export interface EpisodeFile {
  seriesId: number;
  seasonNumber: number;
  relativePath: string;
  path: string;
  size: number;
  dateAdded: string;
  sceneName?: string;
  quality: EpisodeFileQuality;
  language: Language;
  mediaInfo: MediaInfo;
  originalFilePath?: string;
  qualityCutoffNotMet: boolean;
  id: number;
}

export interface Language {
  id: number;
  name: string;
}

export interface MediaInfo {
  audioChannels: number;
  audioCodec: string;
  videoCodec: string;
}

export interface EpisodeFileQuality {
  quality: QualityQuality;
  revision: Revision;
}

export interface QualityQuality {
  id: number;
  name: string;
  source: string;
  resolution: number;
}

export interface Revision {
  version: number;
  real: number;
  isRepack: boolean;
}

export interface Series {
  title: string;
  sortTitle: string;
  seasonCount: number;
  status: string;
  overview: string;
  network: string;
  airTime: string;
  images: Image[];
  seasons: Season[];
  year: number;
  path: string;
  profileId: number;
  languageProfileId: number;
  seasonFolder: boolean;
  monitored: boolean;
  useSceneNumbering: boolean;
  runtime: number;
  tvdbId: number;
  tvRageId: number;
  tvMazeId: number;
  firstAired: string;
  lastInfoSync: string;
  seriesType: string;
  cleanTitle: string;
  imdbId: string;
  titleSlug: string;
  certification?: string;
  genres: string[];
  tags: unknown[];
  added: string;
  ratings: Ratings;
  qualityProfileId: number;
  id: number;
}

export interface Image {
  coverType: CoverType;
  url: string;
}

export enum CoverType {
  Banner = "banner",
  Fanart = "fanart",
  Poster = "poster",
}

export interface Ratings {
  votes: number;
  value: number;
}

export interface Season {
  seasonNumber: number;
  monitored: boolean;
}
