export interface Link {
  short_code: string;
  original_url: string;
  description: string | null;
  is_enabled: number;
  created_at: string;
  last_visited_at: string | null;
  visit_count: number;
}
