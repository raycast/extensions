export type Document = {
  id: string;
  url: string;
  source_url: string;
  title: string;
  author: string;
  source: string;
  category: string;
  location: "new" | "shortlist" | "feed" | "later" | "archive";
  tags: Record<string, { name: string; type: string; created: number }>; // Assuming tags can be an object with unknown structure
  site_name: string;
  word_count: number;
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string
  notes: string;
  published_date: string; // Format: YYYY-MM-DD
  summary: string;
  image_url: string;
  parent_id: string | null; // Can be a string or null
  reading_progress: number; // Assuming a float value between 0 and 1
  first_opened_at: string | null; // Can be a string or null
  last_opened_at: string | null; // Can be a string or null
  saved_at: string; // ISO 8601 date string
  last_moved_at: string; // ISO 8601 date string
};
