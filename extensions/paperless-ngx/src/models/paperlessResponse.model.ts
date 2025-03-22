export interface documentsResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Document[];
}

export interface Document {
  id: number;
  correspondent?: number;
  document_type?: number;
  title: string;
  content: string;
  tags: number[];
  created: string;
  modified: string;
  added: string;
  archive_serial_number?: string;
  original_file_name: string;
  archived_file_name: string;
  __search_hit__: SearchHit;
}

export interface SearchHit {
  score: number;
  highlights: string;
  rank: number;
}

export interface typesResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Type[];
}
export interface Type {
  id: number;
  slug: string;
  name: string;
  match: string;
  matching_algorithm: number;
  is_insensitive: boolean;
  document_count: number;
}

export interface correspondentsResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Correspondent[];
}

export interface Correspondent {
  id: number;
  slug: string;
  name: string;
  match: string;
  matching_algorithm: number;
  is_insensitive: boolean;
  document_count: number;
  last_correspondence: Date;
}

export interface tagsResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Tag[];
}

export interface Tag {
  id: number;
  slug: string;
  name: string;
  colour: number;
  match: string;
  matching_algorithm: number;
  is_insensitive: boolean;
  is_inbox_tag: boolean;
  document_count: number;
}
