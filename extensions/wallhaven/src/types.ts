export interface Thumbs {
  large: string;
  original: string;
  small: string;
}

export interface Wallpaper {
  id: string;
  url: string;
  short_url: string;
  views: number;
  favorites: number;
  source: string;
  purity: "sfw" | "sketchy" | "nsfw";
  category: "general" | "anime" | "people";
  dimension_x: number;
  dimension_y: number;
  resolution: string;
  ratio: string;
  file_size: number;
  file_type: string;
  created_at: string;
  colors: string[];
  path: string;
  thumbs: Thumbs;
}

export interface Tag {
  id: number;
  name: string;
  alias: string;
  category_id: number;
  category: string;
  purity: string;
  created_at: string;
}

export interface Uploader {
  username: string;
  group: string;
  avatar: {
    "200px": string;
    "128px": string;
    "32px": string;
    "20px": string;
  };
}

export interface WallpaperDetail extends Wallpaper {
  uploader: Uploader;
  tags: Tag[];
}

export interface SearchMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  query: string | null | { id: number; tag: string };
  seed: string | null;
}

export interface SearchResponse {
  data: Wallpaper[];
  meta: SearchMeta;
}

export interface WallpaperResponse {
  data: WallpaperDetail;
}

export interface Collection {
  id: number;
  label: string;
  views: number;
  public: number;
  count: number;
}

export interface CollectionsResponse {
  data: Collection[];
}

export interface SearchParams {
  q?: string;
  categories?: string;
  purity?: string;
  sorting?: string;
  order?: string;
  topRange?: string;
  page?: number;
  seed?: string;
}
