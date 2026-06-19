// TypeScript shapes for the Granite Agent API responses. Mirrors the Rails
// serializers (web/app/controllers/api/v1/agent/* and the DocumentSerializer)
// one-to-one — keep these in sync if the API shape changes.

export interface Vault {
  id: string;
  name: string;
  slug: string;
}

export interface Entity {
  id: string;
  display_name: string;
  kind: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
}

export interface ExtractedField {
  field_name: string;
  value: string | null;
}

// Lightweight row from GET /documents and the base of a search result.
export interface DocumentListItem {
  id: string;
  title: string | null;
  filename: string | null;
  doc_type: string | null;
  subtype: string | null;
  status: string;
  primary_date: string | null;
  tax_year: number | null;
  vault: Vault | null;
  created_at: string;
}

export interface SearchResultItem extends DocumentListItem {
  rank: number;
  snippet: string | null;
  entities: Entity[];
}

// Full document from GET /documents/:id (DocumentSerializer).
export interface DocumentDetail {
  id: string;
  title: string | null;
  filename: string | null;
  doc_type: string | null;
  subtype: string | null;
  status: string;
  primary_date: string | null;
  tax_year: number | null;
  net_amount: string | null;
  tax_amount: string | null;
  gross_amount: string | null;
  currency: string | null;
  vault: Vault;
  summary: string | null;
  created_at: string;
  understood_at: string | null;
  entities: Entity[];
  collections: Collection[];
  extracted_fields: ExtractedField[];
  full_text?: string | null;
}

export interface SearchResponse {
  query: string;
  mode: string;
  degraded?: boolean;
  results: SearchResultItem[];
}

export interface DocumentsResponse {
  documents: DocumentListItem[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface Citation {
  document_id: string;
  page_number: number;
  cited_text: string;
}

export interface AggregationTotal {
  currency: string | null;
  sum: string;
  count: number;
}

export interface Aggregation {
  field: string;
  doc_type: string | null;
  range: Record<string, unknown>;
  currency: string | null;
  total_count: number;
  totals: AggregationTotal[];
}

// The ask endpoint returns a deliberately narrower doc shape than /documents —
// it omits primary_date / tax_year / created_at (see AskController#documents_for).
export interface AskDocument {
  id: string;
  title: string | null;
  filename: string | null;
  doc_type: string | null;
  subtype: string | null;
  status: string;
  vault: Vault | null;
}

// POST /ask. `answer` is present when the vault synthesized one; on the
// retrieval fallback it's null and `documents` carries the relevant docs.
export interface AskResponse {
  query: string;
  status: string;
  answer: string | null;
  citations: Citation[];
  documents: AskDocument[];
  aggregation?: Aggregation | null;
  vault_status?: string;
}

export type SearchMode = "hybrid" | "keyword" | "semantic";
