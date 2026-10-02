import type { PrefixPagination, TextPagination } from "./pagination";

export type CaptureImage = {
  frame_id: number;
  timestamp: string;
  timestamp_utc?: string;
  timestamp_local: string;
  timezone: string;
  timestamp_basis: string;
  application: string;
  domain?: string;
  url?: string;
  title: string;
  warnings: string[];
  ocr_text: string;
  ocr_truncated: boolean;
  image_path: string;
  temporary: boolean;
};

export type OcrBoxPage = {
  frame_id: number;
  timestamp: string;
  timestamp_utc?: string;
  timestamp_local: string;
  timezone: string;
  timestamp_basis: string;
  application: string;
  domain?: string;
  url?: string;
  title: string;
  warnings: string[];
  total_box_count: number;
  returned_box_count: number;
  truncated: boolean;
  boxes: {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
  }[];
  pagination: PrefixPagination;
  coverage: string;
};

export type CurrentScreen = {
  timestamp: string;
  timestamp_utc?: string;
  timestamp_local: string;
  timezone: string;
  timestamp_basis: string;
  application: string;
  url?: string;
  title: string;
  image_path: string;
  warnings: string[];
  ocr_text: string;
  ocr_truncated: boolean;
  ocr_text_tail: string;
  ocr_text_tail_offset?: number;
  ocr_offset_unit: string;
  ocr_payload_complete: boolean;
  ocr_character_count: number;
};

// Concrete output objects keep Raycast's schema extractor from losing spread,
// intersection, and nullable-union fields. Missing values are omitted in JSON.
export type CaptureEvidence = {
  frame_id: number;
  timestamp: string;
  timestamp_utc?: string;
  timestamp_local: string;
  timezone: string;
  timestamp_basis: string;
  application: string;
  domain?: string;
  url?: string;
  title: string;
  ocr_text: string;
  ocr_truncated: boolean;
  warnings: string[];
};

export type CaptureTextPage = {
  frame_id: number;
  timestamp: string;
  timestamp_utc?: string;
  timestamp_local: string;
  timezone: string;
  timestamp_basis: string;
  application: string;
  domain?: string;
  url?: string;
  title: string;
  ocr_text: string;
  ocr_truncated: boolean;
  warnings: string[];
  ocr_pagination: TextPagination;
  next_character_offset?: number;
  ocr_completeness: string;
};

export type RelatedCapture = {
  frame_id: number;
  timestamp: string;
  timestamp_utc?: string;
  timestamp_local: string;
  timezone: string;
  timestamp_basis: string;
  application: string;
  domain?: string;
  url?: string;
  title: string;
  ocr_text: string;
  ocr_truncated: boolean;
  warnings: string[];
  match_reason: string;
};

export type AccessibilityTextPage = {
  frame_id: number;
  timestamp: string;
  timestamp_utc?: string;
  timestamp_local: string;
  timezone: string;
  timestamp_basis: string;
  application: string;
  domain?: string;
  url?: string;
  title: string;
  warnings: string[];
  has_tree: boolean;
  has_payload: boolean;
  is_partial_tree: boolean;
  total_node_count: number;
  stored_bytes?: number;
  tree_text: string;
  returned_bytes: number;
  returned_characters: number;
  truncated: boolean;
  text_page_partial: boolean;
  text_pagination: TextPagination;
  next_character_offset?: number;
  completeness: string;
};

export type SearchContinuation = {
  query: string;
  tr?: string;
  appFilters?: string[];
  domainFilters?: string[];
  limit?: number;
  offset: number;
};

export type SearchPage = {
  result_count: number;
  results: CaptureEvidence[];
  pagination: PrefixPagination;
  scope: {
    query: string;
    tr?: string;
    appFilters?: string[];
    domainFilters?: string[];
    limit?: number;
  };
  next_input?: SearchContinuation;
  coverage: string;
};
