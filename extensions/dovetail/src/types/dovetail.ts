export interface Insight {
  id: string;
  title: string;
  type: string;
  created_at: string;
  published: boolean;
}

export interface Field {
  id: string;
  name: string;
  label?: string;
  value: string | string[];
}

export interface Contact {
  id: string;
  name: string | null;
  email?: string | null;
  created_at?: string;
  deleted?: boolean;
  fields?: Field[];
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface Data {
  id: string;
  type: string;
  title: string;
  created_at: string;
  deleted: boolean;
}

export interface ApiResponse<T> {
  data: T;
  pageInfo?: PageInfo;
}

export interface DataExport {
  id: string;
  title: string;
  created_at: string;
  content_markdown?: string;
}

export interface Channel {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
}

export interface ApiEndpoint {
  path: string;
  method: string;
  schema: {
    _type: unknown;
  };
}
