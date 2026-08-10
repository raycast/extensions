interface NYTPopularResult {
  status: string;
  copyright: string;
  num_results: number;
  results: Post[];
}
interface Post {
  uri: string;
  url: string;
  id: number;
  asset_id: number;
  source: string;
  published_date: string;
  updated: string;
  section: string;
  subsection: string;
  nytdsection: string;
  adx_keywords: string;
  column: null;
  byline: string;
  type: string;
  title: string;
  abstract: string;
  des_facet: string[];
  org_facet: string[];
  per_facet: string[];
  geo_facet: string[];
  media: MediaItem[];
  eta_id: number;
}
interface MediaItem {
  type: string;
  subtype: string;
  caption: string;
  copyright: string;
  approved_for_syndication: number;
  "media-metadata": MediaMetadataItem[];
}
interface MediaMetadataItem {
  url: string;
  format: string;
  height: number;
  width: number;
}

export type { NYTPopularResult, Post, MediaItem, MediaMetadataItem };
