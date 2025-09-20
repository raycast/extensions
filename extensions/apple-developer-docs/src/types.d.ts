type AllResultType = "all";
type ResultType = "General" | "documentation" | "video" | "sample_code" | string;

type SearchResult = {
  title: string;
  url: string;
  description: string;
  date: string;
  event_name: string;
  session_id: string;
  tile_image: string;
  relevance: number;
  order: number;
  type: ResultType;
  platform: string[];
  is_beta: 0 | 1;
  language: string;
  lang_children: string[];
  breadcrumbs: string[];
  duration?: string;
};

type FeaturedResult = Pick<SearchResult, "title" | "description" | "url"> & {
  icon: string;
  score: number;
  type: "featured";
};
type ResultLike = SearchResult | FeaturedResult;

type SuggestedQuery = {
  query: string;
  score: number;
  correction: "applied" | "";
};

type PayloadResponse = {
  results: SearchResult[];
  featuredResult: FeaturedResult | "";
  suggested_query: SuggestedQuery | "";
  uuid: string;
};

interface Visitable {
  onVisit: (result: ResultLike) => void;
}
