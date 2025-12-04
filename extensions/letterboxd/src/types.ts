export interface Movie {
  id: string;
  letterboxdId: string; // e.g. aquaman-2018
  title: string;
  director: string;
  released: string;
  detailsPage: string;
  thumbnail?: string;
  rating?: string;
}

export interface Review {
  reviewerName?: string;
  reviewBody?: string;
  reviewUrl?: string;
  rating?: string;
  commentCount?: number;
}

export interface MovieStatistics {
  watches?: number;
  lists?: number;
  likes?: number;
}

export interface MovieRatingHistogram {
  histogram: Array<{
    description: string;
    count: number;
    percentage: number;
  }>;
  rating?: {
    average: number;
    count: number;
  };
  fans?: number;
}

export interface ReleasesByType {
  type?: string;
  releases?: Array<Release>;
}

export interface Release {
  dateString?: string;
  countries?: Array<Country>;
}

export interface Country {
  name?: string;
  flagImg?: string;
  certification?: string;
  note?: string;
}

export interface MovieDetails extends Pick<Movie, "id" | "director" | "title"> {
  directorDetailsPageUrl: string;
  posterUrl?: string;
  description: string;
  released: string;
  runtime?: number;
  stats?: MovieStatistics;
  ratingHistogram?: MovieRatingHistogram;
  releases: Array<ReleasesByType>;
  url: string;
  genres?: string[];
  language?: string;
  reviews?: Array<Review>;
}

export interface Person {
  id: string;
  name: string;
  avatar: string;
  moviesCount?: string;
  friendsCount?: string;
  detailsPage: string;
}

export interface PersonDetails extends Pick<Person, "id" | "name" | "avatar"> {
  url: string;
  isProfilePrivate?: boolean;
  website?: string;
  movies?: Array<Movie>;
  description?: string;
  twitter?: {
    handle: string;
    url: string;
  };
  genres?: Array<{ name: string; link: string }>;
  rating?: string;
  ratingCount?: string;
  reviewCount?: string;
}
