declare type ArrayElementType<T extends unknown[]> = T extends (infer U)[] ? U : never;

declare type MediaType = "movie" | "show";

declare type MovieDetailsMap = Map<number, TMDBMovieDetails | undefined>;

declare type ShowDetailsMap = Map<number, TMDBShowDetails | undefined>;

declare type SeasonDetailsMap = Map<number, TMDBSeasonDetails | undefined>;

declare type EpisodeDetailsMap = Map<number, TMDBEpisodeDetails | undefined>;
