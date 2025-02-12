import { Tag } from "../types";

type Category = "books" | "articles" | "tweets" | "supplementals" | "podcasts";

interface BookParameters {
  page_size?: number;
  page?: number;
  category?: Category;
  source?: string;
  num_highlights?: number;
  num_highlights__lt?: number;
  num_highlights__gt?: number;
  updated__lt?: string;
  updated__gt?: string;
  last_highlight_at__lt?: string;
  last_highlight_at__gt?: string;
}

interface Book {
  id: number;
  title: string;
  author: string;
  category: Category;
  source: string;
  num_highlights: number;
  last_highlight_at: string;
  updated: string;
  cover_image_url: string;
  highlights_url: string;
  source_url: string | null;
  asin: string | null;
  tags: Tag[];
}

interface BookResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Book[];
}
