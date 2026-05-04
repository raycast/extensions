export interface EnpassField {
  label?: string;
  type?: string;
  value?: string;
}

export interface EnpassEntry {
  uuid?: string;
  title: string;
  login?: string;
  username?: string;
  category?: string;
  label?: string;
  type?: string;
  trashed?: boolean;
  fields?: EnpassField[];
  password?: string;
  url?: string;
  notes?: string;
  created_at?: string;
  created_time?: string;
  updated_at?: string;
  updated_time?: string;
  last_used?: string;
  last_used_time?: string;
  usage_count?: string;
}

export type EnpassSortMode =
  | "updated"
  | "created"
  | "used"
  | "usage"
  | "title"
  | "titleDesc"
  | "category";
