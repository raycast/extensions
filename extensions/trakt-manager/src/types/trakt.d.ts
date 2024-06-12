declare type TraktMovieList = Array<{
  type: string;
  score: number;
  movie: {
    title: string;
    year?: number;
    details?: TMDBMovieDetails;
    ids: {
      trakt: number;
      slug: string;
      imdb: string;
      tmdb: number;
    };
  };
}> & {
  page: number;
  total_pages: number;
  total_results: number;
};

declare type TraktMovieListItem = ArrayElementType<TraktMovieList>;

declare type TraktShowList = Array<{
  type: string;
  score: number;
  show: {
    title: string;
    year?: number;
    details?: TMDBShowDetails;
    ids: {
      trakt: number;
      slug: string;
      tvdb: number;
      imdb: string;
      tmdb: number;
    };
  };
}> & {
  page: number;
  total_pages: number;
  total_results: number;
};

declare type TraktShowListItem = ArrayElementType<TraktShowList>;

declare type TraktSeasonList = Array<{
  number: number;
  ids: {
    trakt: number;
    tvdb: number;
    tmdb: number;
  };
  rating: number;
  votes: number;
  episode_count: number;
  aired_episodes: number;
  title: string;
  overview?: string;
  first_aired: string;
  udpated_at: string;
  network: string;
  details?: TMDBSeasonDetails;
}>;

declare type TraktSeasonListItem = ArrayElementType<TraktSeasonList>;

declare type TraktEpisodeList = Array<{
  season: number;
  number: number;
  title: string;
  ids: {
    trakt: number;
    tvdb: number;
    imdb: string;
    tmdb: number;
    tvrage: number;
  };
  number_abs?: number;
  overview?: string;
  rating: number;
  votes: number;
  comment_count: number;
  first_aired: string;
  updated_at: string;
  available_translations: Array<string>;
  runtime: number;
  episode_type: string;
  details?: TMDBEpisodeDetails;
}>;

declare type TraktEpisodeListItem = ArrayElementType<TraktEpisodeList>;

declare type TraktUpNextShowList = Array<{
  plays: number;
  last_watched_at: string;
  last_updated_at: string;
  show: {
    title: string;
    year: number;
    details?: TMDBShowDetails;
    progress?: TraktShowProgress;
    ids: {
      trakt: number;
      slug: string;
      tvdb: number;
      imdb: string;
      tmdb: number;
    };
  };
}>;

declare type TraktUpNextShowListItem = ArrayElementType<TraktUpNextShowList>;

declare type TraktShowProgress = {
  aired: number;
  completed: number;
  last_watched_at: string;
  reset_at?: string;
  seasons: Array<{
    number: number;
    title: string;
    aired: number;
    completed: number;
    episodes: Array<{
      number: number;
      completed: boolean;
      last_watched_at?: string;
    }>;
  }>;
  hidden_seasons: Array<{
    number: number;
    ids: {
      trakt: number;
      tvdb: number;
      tmdb: number;
    };
  }>;
  next_episode?: {
    season: number;
    number: number;
    title: string;
    ids: {
      trakt: number;
      tvdb: number;
      imdb: string;
      tmdb: number;
    };
  };
  last_episode: {
    season: number;
    number: number;
    title: string;
    ids: {
      trakt: number;
      tvdb: number;
      imdb: string;
      tmdb: number;
    };
  };
};
