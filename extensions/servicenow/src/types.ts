export interface HistoryResponse {
  result: HistoryResult[];
}

export interface HistoryResult {
  sys_id: string;
  search_term: string;
}

export interface GlobalSearchResponse {
  result: Result;
}

export interface Result {
  groups: Group[];
}

export interface Group {
  description: string;
  tables: Table[];
  name: string;
  id: string;
  result_count: number;
  search_results: SearchResult[];
}
export interface SearchResult {
  label: string;
  limit: number;
  query: string;
  keywords: string;
  page: number;
  sourceId: string;
  records: Record[];
  name: string;
  fields: Field[];
  record_count: number;
  label_plural: string;
  all_results_url: string;
}

export interface Field {
  label: string;
  name: string;
  type: string;
  label_plural: string;
  max_length: number;
  reference?: string;
}

export interface Record {
  table: string;
  data: Data;
  score: number;
  baseTable: string;
  metadata: Metadata;
  recordClassName: string;
  attachments: string[];
  relativeOffset: number;
  sys_id: string;
  record_url: string;
}

export interface Data {
  number?: DataValue;
  sys_id: DataValue;
  sys_updated_on?: DataValue;
  kb_category?: DataValue;
  price?: DataValue;
  category?: DataValue;
  priority?: DataValue;
  u_icon?: DataValue;
  u_workspace?: DataValue;
}

export interface DataValue {
  display: string;
  value: string | number;
}

export interface Metadata {
  additionalInfo: AdditionalInfo;
  title: string;
  description: string;
  thumbnailURL: string;
}

export interface AdditionalInfo {}

export interface Table {
  filter: string;
  label: string;
  name: string;
  id: string;
  condition_query: string;
  label_plural: string;
  optional_label?: string;
}

export interface Instance {
  id: string;
  name: string;
  alias?: string;
  color: string;
  username: string;
  password: string;
}

export interface DBObjectsResponse {
  result: DBObject[];
}

export interface DBObject {
  name: string;
  label: string;
  super_class: string;
}
