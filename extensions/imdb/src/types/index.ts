import { Dispatch, SetStateAction } from 'react';

export interface ItemBase {
  Title: string; // "Casino Royale"
  Year: string; // "2006"
  imdbID: string; // "tt0381061"
  Type: string; //  'movie'
  Poster: string; // "https://m.media-amazon.com/images/M/MV5BMDI5ZWJhOWItYTlhOC00YWNhLTlkNzctNDU5YTI1M2E1MWZhXkEyXkFqcGdeQXVyNTIzOTk5ODM@._V1_SX300.jpg"
}

type Item = ItemBase & {
  Rated: string; // "PG-13"
  Released: string; // "17 Nov 2006"
  Runtime: string; // "144 min"
  Genre: string; // "Action, Adventure, Thriller"
  Director: string; // "Martin Campbell"
  Writer: string; // "Neal Purvis, Robert Wade, Paul Haggis"
  Actors: string; // "Daniel Craig, Eva Green, Judi Dench"
  Plot: string; // "After earning 00 status and a licence to kill, secret agent James Bond sets out on his first mission as 007. Bond must defeat a private banker funding terrorists in a high-stakes game of poker at Casino Royale, Montenegro."
  Language: string; // "English, Serbian, German, Italian, French"
  Country: string; // "United Kingdom, Czech Republic, United States, Germany, Bahamas"
  Awards: string; // "27 wins & 44 nominations total"
  Ratings: {
    Source: string; // "Internet Movie Database" | "Rotten Tomatoes" | "Metacritic"
    Value: string; // "8.0/10" | "94%" | "80/100"
  }[];
  Metascore: string; // "8.0"
  imdbRating: string; // "8.0"
  imdbVotes: string; // " 616,745"
  DVD: string; // "13 Mar 2007"
  BoxOffice?: string; // "$167,445,960"
  Production?: string; // "N/A"
  Website?: string; // "N/A"
  totalSeasons?: string; // "6"
};

interface ResponseBase {
  Response: 'True' | 'False';
  Error?: string;
}

export type ItemResponse = Item & ResponseBase;

export interface ListProps {
  data: ItemBase[] | null | undefined;
  isLoading: boolean;
  onSearch: Dispatch<SetStateAction<string>>;
  search: string;
}
export interface ListItemProps {
  item: ItemBase;
}

export interface ItemDetailProps {
  item: ItemResponse;
}

export interface Preferences {
  token: string;
}

interface SearchSuccess {
  Search: ItemBase[];
  Response: 'True';
}

interface SearchError {
  Error: string;
  Response: 'False';
}

export type SearchResponse = SearchSuccess | SearchError;
