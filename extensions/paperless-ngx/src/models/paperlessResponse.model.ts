export type paperlessFetchResponse = paperlessDocumentResponse;



export interface paperlessDocumentResponse {
  count: number;
  next?: string;
  previous?: string;
  results: paperlessDocumentResults[];
}

export interface paperlessDocumentResults {
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

export interface paperlessDocumentTypesResponse {
  count: number;
  next?: string;
  previous?: string;
  results: paperlessDocumentTypes[];
}
export interface paperlessDocumentTypes {
  id: number;
  slug: string;
  name: string;
  match: string;
  matching_algorithm: number;
  is_insensitive: boolean;
  document_count: number;
}

export interface paperlessCorrespondentsResponse {
  count: number;
  next?: string;
  previous?: string;
  results: paperlessCorrespondentResults[];
}

export interface paperlessCorrespondentResults {
  id: number;
  slug: string;
  name: string;
  match: string;
  matching_algorithm: number;
  is_insensitive: boolean;
  document_count: number;
  last_correspondence: Date;
}

export interface paperlessDocumentTagsResponse {
  count: number;
  next?: string;
  previous?: string;
  results: paperlessDocumentTagsResults[];
}

export interface paperlessDocumentTagsResults {
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