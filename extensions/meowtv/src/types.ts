export interface HomePageRow {
  name: string;
  contents: ContentItem[];
}

export interface ContentItem {
  title: string;
  coverImage: string;
  id: string;
  type: "movie" | "series";
  extra?: Record<string, unknown>;
}

export interface MovieDetails {
  id: string;
  title: string;
  description?: string;
  coverImage: string;
  backgroundImage?: string;
  year?: number;
  score?: number;
  episodes?: Episode[];
  seasons?: Season[];
  tags?: string[];
  actors?: { name: string; image?: string }[];
}

export interface Episode {
  id: string;
  title: string;
  number: number;
  season: number;
  coverImage?: string;
  description?: string;
}

export interface Season {
  id: string;
  number: number;
  name: string;
}

export interface VideoResponse {
  videoUrl: string;
  subtitles?: { language: string; url: string; label: string }[];
  qualities?: { quality: string; url: string }[];
  headers?: Record<string, string>;
}
