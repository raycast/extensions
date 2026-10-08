import type { Image, Ratings, Season } from "./episode";

export interface SeriesLookup {
  title: string;
  sortTitle: string;
  status: string;
  overview: string;
  network?: string | null;
  images: Image[];
  remotePoster?: string;
  seasons: Season[];
  year: number;
  tvdbId: number;
  tvRageId?: number;
  tvMazeId?: number;
  imdbId?: string | null;
  titleSlug: string;
  certification?: string | null;
  genres: string[];
  tags: number[];
  added?: string;
  ratings: Ratings;
  runtime: number;
  seriesType: string;
  cleanTitle: string;
  firstAired?: string | null;
  statistics?: SeriesStatistics;
}

export interface SeriesStatistics {
  seasonCount: number;
  episodeFileCount: number;
  episodeCount: number;
  totalEpisodeCount: number;
  sizeOnDisk: number;
  percentOfEpisodes: number;
}

export interface SeriesFull {
  id: number;
  title: string;
  sortTitle: string;
  seasonCount: number;
  status: string;
  overview: string;
  network?: string | null;
  airTime?: string | null;
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
  firstAired?: string | null;
  lastInfoSync?: string;
  seriesType: string;
  cleanTitle: string;
  imdbId?: string | null;
  titleSlug: string;
  certification?: string | null;
  genres: string[];
  tags: number[];
  added: string;
  ratings: Ratings;
  qualityProfileId: number;
  statistics?: SeriesStatistics;
  ended: boolean;
}

export interface AddSeriesOptions {
  title: string;
  qualityProfileId: number;
  titleSlug: string;
  images: Image[];
  seasons: Season[];
  tvdbId: number;
  tvRageId?: number;
  tvMazeId?: number;
  imdbId?: string | null;
  rootFolderPath: string;
  monitored: boolean;
  seasonFolder: boolean;
  addOptions: {
    searchForMissingEpisodes: boolean;
    searchForCutoffUnmetEpisodes: boolean;
  };
}

export interface RootFolder {
  id: number;
  path: string;
  accessible: boolean;
  freeSpace: number;
  unmappedFolders: Array<{ name: string; path: string }>;
}

export interface QualityProfile {
  id: number;
  name: string;
  upgradeAllowed: boolean;
  cutoff: number;
  items: QualityProfileItem[];
}

export interface QualityProfileItem {
  quality?: QualityDefinition;
  items?: QualityProfileItem[];
  allowed: boolean;
  id?: number;
  name?: string;
}

export interface QualityDefinition {
  id: number;
  name: string;
  source: string;
  resolution: number;
}
