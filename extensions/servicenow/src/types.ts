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
  title: string;
  description: string;
  thumbnailURL: string;
}

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
  full: string;
}

export interface DBObjectsResponse {
  result: DBObject[];
}

export interface DBObject {
  name: string;
  label: string;
  super_class: string;
}

export interface FullNavigationHistoryResponse {
  result: NavigationHistoryEntry[];
}

export interface NavigationHistoryResponse {
  result: { list: NavigationHistoryEntry[] };
}

export interface NavigationHistoryEntry {
  sys_id?: string;
  id: string;
  title: string;
  description?: string;
  url: string;
  sys_created_on?: string;
  createdString?: string;
}

export interface FavoritesResponse {
  list: Favorite[];
}

export interface Favorite {
  id: string;
  title: string;
  group: boolean;
  groupId?: string;
  module?: string;
  favorites?: Favorite[];
  applicationId?: string;
  type?: string;
  separator?: boolean;
  url?: string;
  query?: string;
  table?: string;
  group_title?: string;
  section_title?: string;
  keywords?: string[];
}

export interface FavoriteRecord {
  sys_id: string;
  title: string;
  user: string;
  url?: string;
  icon?: string;
  module?: string;
  application?: string;
  group?: string;
}

export interface NavigationMenuResponse {
  result: Module[];
}

export interface Module {
  uri?: string;
  title: string;
  type?: string;
  tableName?: string;
  id: string;
  modules?: Module[];
  count?: number;
}
