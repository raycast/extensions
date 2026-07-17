export type Media = {
  Title: string;
  Year: string;
  imdbID: string;
  Type: string;
  Poster: string;
};

export interface MediaDetails {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: { Source: string; Value: string }[];
  Metascore: string;
  imdbRating: string;
  imdbVotes: number;
  imdbID: string;
  Type: string;
  DVD: string;
  BoxOffice: string;
  Production: string;
  Website?: string;
  Response?: string;
  totalSeasons?: number;
}

export interface Episode {
  Poster: string;
  Title: string;
  Released: string;
  Episode: number;
  imdbRating: string;
  imdbID: string;
}

export interface EpisodeDetails extends Episode {
  Plot: string;
  Rated: string;
  Season: number;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Language: string;
  Country: string;
  Awards: string;
  seriesID: string;
  Type: string;
  Response: string;
}

export interface DetailViewProps {
  media: MediaDetails;
  titleOrId: string;
  poster: string;
}

export interface AIOverviewProps {
  media: MediaDetails;
  episode?: Episode;
}

export interface EpisodeListProps {
  media: MediaDetails;
  totalSeasons: number;
}

export interface EpisodeListItemProps {
  episode: Episode;
  media: MediaDetails;
  seasonNumber: number;
}

export interface SearchBarAccessoryProps {
  viewType: string;
  setViewType: (value: string) => void;
}

export interface StreamingProvider {
  source_id: number;
  name: string;
  type: string;
  region: string;
  ios_url: string;
  android_url: string;
  web_url: string;
  format: string;
  price: number | null;
  seasons?: number;
  episodes?: number;
}

export interface ProvidersListViewProps {
  providers: StreamingProvider[];
  isLoading: boolean;
}
