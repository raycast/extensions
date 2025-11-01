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
  emoji?: string;
  category: string;
  primary_image?: { url: string; caption: string; credit: string };
  talking_points?: string[];
  secondary_image?: { url: string; caption: string; credit: string };
  perspectives?: Array<{ text: string; sources: Source[] }>;
  historical_background?: string;
  technical_details?: string[];
  industry_impact?: string[];
  timeline?: Array<{ date: string; content: string }>;
  international_reactions?: string[];
  did_you_know?: string;
}
export interface Article {
  id: string;
  title: string;
  summary: string;
  sources: Source[];
  emoji?: string;
  category: string;
  primary_image?: { url: string; caption: string; credit: string };
  highlights?: string[];
  secondary_image?: { url: string; caption: string; credit: string };
  perspectives?: Array<{ text: string; sources: Source[] }>;
  historical_background?: string;
  technical_details?: string[];
  industry_impact?: string[];
  timeline?: Array<{ date: string; content: string }>;
  international_reactions?: string[];
  didYouKnow?: string;
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
