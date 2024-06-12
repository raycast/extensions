type Category = {
  id: number;
  name: string;
};

type SearchResult = {
  id: number;
  name: string;
  credit: string;
  created_at: string;
  updated_at: string;
  image_url: string;
  category: Category;
};

type SearchResults = SearchResult[];

export { type SearchResult, type SearchResults, type Category };
