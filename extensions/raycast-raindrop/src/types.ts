// Raindrop.io API types

export interface RaindropBookmark {
  _id: number;
  title: string;
  note: string;
  excerpt: string;
  link: string;
  cover: string;
  domain?: string;
  tags: string[];
  type: string;
  created: string;
  lastUpdate: string;
  collection: { $id: number; title?: string };
  highLevel?: {
    cover?: string;
  };
}

export interface RaindropCollection {
  _id: number;
  title: string;
  cover?: string[];
  color?: string;
  count: number;
  parent?: { $id: number };
}

export interface SearchResponse {
  result: boolean;
  items: RaindropBookmark[];
  count: number;
}

export interface CollectionsResponse {
  result: boolean;
  items: RaindropCollection[];
}

export interface CreateBookmarkRequest {
  link: string;
  title?: string;
  note?: string;
  tags?: string[];
  collection?: { $id: number };
}

export interface CreateBookmarkResponse {
  result: boolean;
  item?: RaindropBookmark;
  errorMessage?: string;
}

export interface Preferences {
  apiToken: string;
}
