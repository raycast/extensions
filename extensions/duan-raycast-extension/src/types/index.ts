export interface Link {
  short_code: string;
  original_url: string;
  description: string | null;
  is_enabled: number;
  created_at: string;
  last_visited_at: string | null;
  visit_count: number;
}

export type SortOption =
  | "created_desc" // Newest first
  | "created_asc" // Oldest first
  | "visited_desc" // Recently visited
  | "visited_asc" // Least recently visited
  | "visits_desc" // Most visited
  | "visits_asc"; // Least visited

export type FilterOption = "all" | "active" | "disabled";
