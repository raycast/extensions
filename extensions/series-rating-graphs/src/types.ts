export type SearchResult = {
  id: string;
  type: string;
  primaryTitle: string;
  originalTitle: string;
  primaryImage: {
    url: string;
    width: number;
    height: number;
  };
  startYear: number;
  endYear: number;
  rating: {
    aggregateRating: number;
    voteCount: number;
  };
};

export type ShowResult = {
  id: number;
  type: string;
  primaryTitle: string;
  primaryImage: {
    url: string;
    width: number;
    height: number;
  };
  startYear: number;
  endYear: number;
  runtimeSeconds: number;
  genres: string[];
  rating: {
    aggregateRating: number;
    voteCount: number;
  };
  plot: string;
};

export type Episode = {
  id: string;
  title: string;
  primaryImage: {
    url: string;
    width: number;
    height: number;
  };
  season: string;
  episodeNumber: number;
  runtimeSeconds: number;
  plot: string;
  rating: {
    aggregateRating: number;
    voteCount: number;
  };
  releaseDate: {
    year: number;
    month: number;
    day: number;
  };
};
