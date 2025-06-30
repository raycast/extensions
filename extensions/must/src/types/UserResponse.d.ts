export interface UserResponse {
  error?: {
    code?: string;
    message?: string;
  };
  lists: Lists;
  followers: number[];
  following: number[];
  rates_statistics: RatesStatistics;
  directors: Director[];
  actors: Director[];
  hours_spent: HoursSpent;
  bio_message: string;
  links: Links;
  id: number;
  uri: string;
  name: string;
  user_image: string;
  is_private: boolean;
  verified: boolean;
  phone_md5?: string;
  mute?: boolean;
  gender: string;
  want_count: number;
  followers_count: number;
  following_count: number;
  you_follow?: boolean;
  follows_you?: boolean;
  rating: Rating[];
  watched_by_type: HoursSpent;
}

export interface Rating {
  date: string;
  rating: number;
}

export interface Links {
  instagram: string;
  telegram: string;
  twitter: string;
  website: string;
}

export interface HoursSpent {
  movies: number;
  shows: number;
  youtube: number;
}

export interface Director {
  watched_percent: number;
  watched_count: number;
  person: Person;
}

export interface Person {
  id: number;
  image_uri: string;
  name: string;
  gender: string;
  related_movies_count: number;
  related_shows_count: number;
}

export interface RatesStatistics {
  average_rate: number;
  rates_count: number;
  high_rate_percent: number;
  rates_distribution: RatesDistribution[];
}

export interface RatesDistribution {
  rate: number;
  count: number;
}

export interface Lists {
  want: number[];
  shows: number[];
  watched: number[];
  youtube: number[];
}
