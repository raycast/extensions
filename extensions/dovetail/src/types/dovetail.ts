export interface Insight {
  id: string;
  title: string;
  type: string;
  created_at: string;
  published: boolean;
}

export interface Note {
  id: string;
  title: string;
  project_title: string;
  created_at: string;
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  created_at?: string;
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