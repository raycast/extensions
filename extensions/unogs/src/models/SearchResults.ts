export interface SearchItem {
  title: string;
  img: string;
  title_type: string;
  netflix_id: number;
  synopsis: string;
  rating: string;
  year: string;
  runtime: string;
  imdb_id: string;
  poster: string;
  top250: number;
  top250tv: number;
  title_date: string;
}

export interface SearchResults {
  Object: { total: number; limit: number; offset: number };
  results?: SearchItem[];
}
