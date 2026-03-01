export interface Link {
  id: string;
  url: string;
  title: string;
  domain: string;
  summary: string | null;
  favicon_url: string | null;
  image_url: string | null;
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
  read_at: string | null;
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
}

export interface UpdateLinksResponse {
  success: true;
  updated: number;
}

export interface DeleteLinkResponse {
  success: true;
  message: string;
  linkId: string;
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
}
