export interface Nts {
  metadata: Metadata;
  results: Result[];
  links: Link[];
}

export interface Link {
  rel: string;
  href: string;
  type: string;
}

export interface Metadata {
  popular_terms: string[];
  resultset: Resultset;
}

export interface Resultset {
  count: number;
  offset: number;
  limit: number;
}

export interface Result {
  title: string;
  article_type: string;
  artists: any[];
  article: Article;
  audio_sources: AudioSource[];
  description: Description;
  image: Image;
  related_episode: any;
  local_date: string;
  location: string;
  genres: Genre[];
}

export interface Article {
  path: string;
}

export interface AudioSource {
  url: string;
  source: Source;
}

export enum Source {
  Mixcloud = "mixcloud",
  Soundcloud = "soundcloud",
}

export interface Description {
  highlight_html: string;
  highlight_plain: string;
}

export interface Genre {
  id: string;
  name: string;
}

export interface Image {
  large: string;
  medium_large: string;
  medium: string;
  small: string;
  thumb: string;
}
