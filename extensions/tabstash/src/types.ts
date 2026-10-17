export interface LinkItem {
  id: string;
  url: string;
  url_raw: string;
  title: string;
  hostname: string;
  note: string;
  sync_status: string;
  favicon_url: string;
  description: string;
  save_count: number;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  tags: string[];
  folder_id: string | null;
  folder_name: string | null;
}

export interface SearchResponse {
  items: LinkItem[];
}

export interface RecentResponse {
  items: LinkItem[];
  cursor: string | null;
}

export interface MeResponse {
  sub: string;
  email?: string;
  ai_enabled?: boolean;
}
