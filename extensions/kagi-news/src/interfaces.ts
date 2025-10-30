export interface Category {
  name: string;
  file: string;
}
export interface Source {
  name: string;
  url: string;
}
interface ClusterArticle {
  title: string;
  link: string;
}
export interface Cluster {
  cluster_number: number;
  title: string;
  short_summary: string;
  articles: ClusterArticle[];
  talking_points?: string[];
  did_you_know?: string;
  emoji?: string;
  category: string;
}
export interface Article {
  id: string;
  title: string;
  summary: string;
  sources: Source[];
  highlights?: string[];
  didYouKnow?: string;
  emoji?: string;
  category: string;
}
export interface CategoryResponse {
  category: string;
  timestamp: number;
  clusters: Cluster[];
}
export interface HistoricalEvent {
  year: string;
  content: string;
  type: string;
  sort_year: number;
}
export interface OnThisDayResponse {
  timestamp: number;
  events: HistoricalEvent[];
}
export interface KiteResponse {
  categories: Category[];
  timestamp?: number;
}
