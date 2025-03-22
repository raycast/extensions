declare type TMDBMovieDetails = {
  adult: boolean;
  backdrop_path: string;
  belongs_to_collection: string;
  budget: number;
  genres: Array<{
    id: number;
    name: string;
  }>;
  homepage: string;
  id: number;
  imdb_id: string;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path?: string;
  production_companies: Array<{
    id: number;
    logo_path: string;
    name: string;
    origin_country: string;
  }>;
  production_countries: Array<{
    iso_3166_1: string;
    name: string;
  }>;
  release_date: string;
  revenue: number;
  runtime: number;
  spoken_languages: Array<{
    english_name: string;
    iso_639_1: string;
    name: string;
  }>;
  status: string;
  tagline: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
};

declare type TMDBShowDetails = {
  adult: boolean;
  backdrop_path: string;
  created_by: Array<{
    id: number;
    credit_id: string;
    name: string;
    gender: number;
    profile_path?: string;
  }>;
  episode_run_time: Array<number>;
  first_air_date: string;
  genres: Array<{
    id: number;
    name: string;
  }>;
  homepage: string;
  id: number;
  in_production: boolean;
  languages: Array<string>;
  last_air_date: string;
  last_episode_to_air: {
    id: number;
    overview: string;
    name: string;
    vote_average: number;
    vote_count: number;
    air_date: string;
    episode_number: number;
    episode_type: string;
    production_code: string;
    runtime: number;
    season_number: number;
    show_id: number;
    still_path?: string;
  };
  name: string;
  next_episode_to_air?: string;
  networks: Array<{
    id: number;
    logo_path: string;
    name: string;
    origin_country: string;
  }>;
  number_of_episodes: number;
  number_of_seasons: number;
  origin_country: Array<string>;
  original_language: string;
  original_name: string;
  overview: string;
  popularity: number;
  poster_path?: string;
  production_companies: Array<{
    id: number;
    logo_path?: string;
    name: string;
    origin_country: string;
  }>;
  production_countries: Array<{
    iso_3166_1: string;
    name: string;
  }>;
  seasons: Array<{
    air_date: string;
    episode_count: number;
    id: number;
    name: string;
    overview: string;
    poster_path?: string;
    season_number: number;
    vote_average: number;
  }>;
  spoken_languages: Array<{
    english_name: string;
    iso_639_1: string;
    name: string;
  }>;
  status: string;
  tagline: string;
  type: string;
  vote_average: number;
  vote_count: number;
};

declare type TMDBSeasonDetails = {
  _id: string;
  air_date: string;
  episodes: Array<{
    air_date: string;
    episode_number: number;
    id: number;
    name: string;
    overview: string;
    production_code: string;
    runtime: number;
    season_number: number;
    show_id: number;
    still_path?: string;
    vote_average: number;
    vote_count: number;
    crew: Array<{
      department: string;
      job: string;
      credit_id: string;
      adult: boolean;
      gender: number;
      id: number;
      known_for_department: string;
      name: string;
      original_name: string;
      popularity: number;
      profile_path?: string;
    }>;
    guest_stars: Array<{
      character: string;
      credit_id: string;
      order: number;
      adult: boolean;
      gender: number;
      id: number;
      known_for_department: string;
      name: string;
      original_name: string;
      popularity: number;
      profile_path?: string;
    }>;
  }>;
  name: string;
  overview: string;
  id: number;
  poster_path?: string;
  season_number: number;
  vote_average: number;
};

declare type TMDBEpisodeDetails = {
  air_date: string;
  crew: Array<{
    department: string;
    job: string;
    credit_id: string;
    adult: boolean;
    gender: number;
    id: number;
    known_for_department: string;
    name: string;
    original_name: string;
    popularity: number;
    profile_path?: string;
  }>;
  episode_number: number;
  guest_stars: Array<{
    character: string;
    credit_id: string;
    order: number;
    adult: boolean;
    gender: number;
    id: number;
    known_for_department: string;
    name: string;
    original_name: string;
    popularity: number;
    profile_path?: string;
  }>;
  name: string;
  overview: string;
  id: number;
  production_code: string;
  runtime: number;
  season_number: number;
  still_path?: string;
  vote_average: number;
  vote_count: number;
};
