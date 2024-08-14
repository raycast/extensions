export interface SearchResult {
  total: number;
  corrected_query: boolean;
  page_handle: string;
  results: ResultsItem[];
  suggestions: unknown[];
  aggregations: unknown[];
}
export interface ResultsItem {
  _score: number;
  fields: Fields;
  result_type: string;
  custom: boolean;
  railcar: Railcar;
  highlight: Highlight;
}
interface Fields {
  date: string;
  "has.image"?: number;
  blog_id: number;
  "'image.url.raw'"?: string[] | string;
  "'image.alt_text'"?: string[] | string;
  "@type": string;
  "permalink.url.raw": string;
  "title.default": string;
  post_id: number;
  post_type: string;
  "excerpt.default": string;
  "'tag.name.default'"?: string[] | string;
  "'category.name.default'"?: string | string[];
  "category.name.default"?: string;
  "image.url.raw"?: string[];
  "image.alt_text"?: string[];
  "tag.name.default"?: string[];
}
interface Railcar {
  railcar: string;
  fetch_algo: string;
  fetch_position: number;
  rec_blog_id: number;
  rec_post_id: number;
  fetch_lang: string;
  fetch_query: string;
  session_id: string;
}
interface Highlight {
  title: string[];
  content: string[];
  comments?: string[];
}
