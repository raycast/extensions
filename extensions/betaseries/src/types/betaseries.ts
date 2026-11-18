// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface BetaSeriesResponse<T = unknown> {
  errors: unknown[];
  [key: string]: unknown; // Generic wrapper, usually the key is the resource name (shows, movies, etc.)
}

export interface Show {
  id: number;
  thetvdb_id: number;
  imdb_id: string;
  title: string;
  description: string;
  seasons: string;
  seasons_details: SeasonDetail[];
  episodes: string;
  followers: string;
  comments: string;
  similars: string;
  characters: string;
  creation: string;
  showrunner: unknown;
  length: string;
  network: string;
  rating: string;
  status: string;
  language: string;
  notes: Notes;
  in_account: boolean;
  images: Images;
  aliases: unknown;
  user: UserShowData;
  resource_url: string;
}

export interface SeasonDetail {
  number: number;
  episodes: number;
}

export interface Notes {
  total: number;
  mean: number;
  user: number;
}

export interface Images {
  show: string;
  banner: string;
  box: string;
  poster: string;
}

export interface UserShowData {
  archived: boolean;
  favorited: boolean;
  remaining: number;
  status: number;
  last: string;
  tags: string;
  next: Episode;
}

export interface Movie {
  id: number;
  title: string;
  original_title: string;
  tmdb_id: number;
  imdb_id: string;
  url: string;
  poster: string;
  backdrop: string;
  production_year: number;
  release_date: string;
  original_release_date: string;
  vote_average: number;
  vote_count: number;
  synopsis: string;
  director: string;
  length: number;
  genres: string[];
  user?: UserMovieData;
}

export interface UserMovieData {
  in_account: boolean;
  status: number; // 0 = to watch, 1 = watched, 2 = do not want to watch
}

export interface Episode {
  id: number;
  thetvdb_id: number;
  youtube_id: string;
  title: string;
  season: number;
  episode: number;
  show: {
    id: number;
    title: string;
  };
  code: string;
  global: number;
  description: string;
  director: string;
  writer: string;
  special: number;
  comments: string;
  resource_url: string;
  user: UserEpisodeData;
  date: string;
}

export interface UserEpisodeData {
  seen: boolean;
}

export interface MemberPlanning {
  date: string;
  episode_id: number;
  show_id: number;
  show_title: string;
  season: number;
  episode: number;
  title: string;
  code: string;
}
