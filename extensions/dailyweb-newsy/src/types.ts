export interface Term {
  id: number;
  name: string;
  taxonomy: string;
}

export interface Post {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  link: string;
  date: string;
  author: number;
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url: string }>;
    author?: Array<{
      id: number;
      name: string;
      avatar_urls?: Record<string, string>;
    }>;
    "wp:term"?: Array<Term[]>;
  };
}

export interface AuthorFilter {
  id: number;
  name: string;
}
