export interface SearchData {
  data: Item[];
  pages: number;
  count: number;
}

interface Localized {
  lang: string;
  text: string;
}
export interface Item {
  uuid: string;
  url: string;
  api_url: string;
  category: Category;
  parent_uuid?: null;
  display_title: string;
  primary_lookup_id_type: string;
  primary_lookup_id_value: string;
  external_resources: {
    url: string;
  };
  title: string;
  brief: string;
  cover_image_url: string;
  rating: number;
  rating_count: number;
  localized_title: Localized[];
}

export type Category = "book" | "movie" | "tv" | "music" | "game" | "podcast" | "performance";

export interface Book extends Item {
  subtitle: string;
  orig_title: string;
  author: string[];
  translator: string[];
  language: string;
  pub_house: string;
  pub_year: number;
  pub_month: number;
  binding: string;
  price: string;
  pages: string;
  series: string;
  imprint: string;
  isbn: string;
}

export interface Movie extends Item {
  orig_title: string;
  other_title: string[];
  director: string[];
  playwright: string[];
  actor: string[];
  genre: string[];
  language: string[];
  area: string[];
  year: number;
  site: string;
  duration: string;
  imdb: string;
}

export interface TV extends Omit<Movie, "duration" | "imdb"> {
  season_number: number;
  episode_count: number;
}

export interface Podcast extends Item {
  genre: string[];
  hosts: string[];
  official_site: string;
}

export interface Album extends Item {
  other_title: string[];
  genre: string[];
  artist: string[];
  company: string[];
  duration: number;
  release_date: Date;
  track_list: string;
  barcode: string;
}

export interface Game extends Item {
  genre: string[];
  developer: string[];
  publisher: string[];
  platform: string[];
  release_date: Date;
  official_site: string;
}

export interface Performance extends Item {
  orig_title: string;
  other_title: string[];
  genre: string[];
  language: string[];
  opening_date: string;
  closing_date: string;
  director: string[];
  playwright: string[];
  orig_creator: string[];
  composer: string[];
  choreographer: string[];
  performer: string[];
  actor: Actor[];
  crew: Actor[];
  official_site: string;
}

interface Actor {
  name: string;
  role: string;
}

export type ItemType = Podcast | Movie | Book | Performance | Album | Game | Book | TV;

export interface PaginatedResult<T> {
  data: T[];
  pages: number;
  count: number;
}
export interface Collection {
  uuid: string;
  url: string;
  visibility: 0 | 1 | 2;
  created_time: string;
  title: string;
  brief: string;
  cover: string;
  html_content: string;
}
export interface Review {
  url: string;
  visibility: 0 | 1 | 2;
  item: Item;
  created_time: string;
  title: string;
  body: string;
  html_content: string;
}
