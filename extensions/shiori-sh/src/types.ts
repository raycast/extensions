export interface Link {
  id: string;
  url: string;
  title: string;
  domain: string;
  summary: string | null;
  image_url: string | null;
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
  read_at: string | null;
  deleted_at: string | null;
  hn_url: string | null;
  file_type: string | null;
  file_mime_type: string | null;
  notion_page_id: string | null;
  author: string | null;
  discoverable_feed_url: string | null;
}

export interface LinksResponse {
  success: true;
  links: Link[];
  total: number;
}

export interface CreateLinkResponse {
  success: true;
  linkId: string;
  duplicate?: boolean;
  link: Link;
}

export interface UpdateLinksResponse {
  success: true;
  updated: number;
}

export interface UpdateLinkResponse {
  success: true;
  message: string;
  linkId: string;
  link: Link;
}

export interface DeleteLinkResponse {
  success: true;
  message: string;
  linkId: string;
  link: Link;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export interface FetchLinksParams {
  limit?: number;
  offset?: number;
  read?: "all" | "read" | "unread";
  sort?: "newest" | "oldest";
  search?: string;
}
