export type paperlessFetchResponse = paperlessDocumentResponse;

export interface paperlessDocumentResponse {
  count: number;
  next?: string;
  previous?: string;
  results: document[];
}

export interface document {
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

export interface documentTypesResponse {
  count: number;
  next?: string;
  previous?: string;
  results: documentType[];
}
export interface documentType {
  id: number;
  slug: string;
  name: string;
  match?: string;
  matching_algorithm?: number;
  is_insensitive?: boolean;
  document_count?: number;
}

export interface correspondentsResponse {
  count: number;
  next?: string;
  previous?: string;
  results: correspondent[];
}

export interface correspondent {
  id: number;
  slug: string;
  name: string;
  match?: string;
  matching_algorithm?: number;
  is_insensitive?: boolean;
  document_count?: number;
  last_correspondence?: Date;
}

export interface pocumentTagsResponse {
  count: number;
  next?: string;
  previous?: string;
  results: documentTag[];
}

export interface documentTag {
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