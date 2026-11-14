// The shapes docs/api.md describes, as far as the extension reads them.

export type Progress = { fraction?: number | null; position?: number | null; updated_at?: string | null };

export type Article = {
  id: number;
  url: string;
  title: string | null;
  author: string | null;
  site_name: string | null;
  domain: string | null;
  excerpt?: string | null;
  word_count: number | null;
  reading_time: number | null;
  lead_image_url?: string | null;
  favicon_url: string | null;
  status: "pending" | "ready" | "failed";
  error_message?: string | null;
  liked: boolean;
  archived: boolean;
  folder_id: number | null;
  tags: string[];
  highlights_count: number;
  progress: Progress | null;
  saved_at: string;
  published_at?: string | null;
  snippet?: string | null;
  content_html?: string | null;
  highlights?: Highlight[];
};

export type HighlightColor = "yellow" | "green" | "blue" | "pink" | "purple";

export type Highlight = {
  id: number;
  article_id: number;
  quote: { exact: string; prefix: string; suffix: string };
  color: HighlightColor;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

export type Folder = { id: number; name: string; position: number; article_count: number };

export type Tag = { id: number; name: string; article_count: number };

export type Me = {
  id: number;
  email_address: string;
  counts: { unread: number; liked: number; archived: number; highlights: number };
  revision: number;
  device_name: string | null;
};

export type ArticlePage = { articles: Article[]; next_cursor: string | null };

export type Deletion = { record_type: "article" | "highlight" | "folder" | "tag"; record_id: number };

export type SyncPage = {
  articles: Article[];
  highlights: Highlight[];
  folders: Folder[];
  tags: Tag[];
  deletions: Deletion[];
  cursor: number;
  has_more: boolean;
};

// The copy of the account kept on disk, fed by GET /sync. Highlights,
// Read Next and the menu bar read it, so they open without waiting.
export type Library = {
  account: string;
  cursor: number;
  articles: Record<string, Article>;
  highlights: Record<string, Highlight>;
  folders: Record<string, Folder>;
  tags: Record<string, Tag>;
};
