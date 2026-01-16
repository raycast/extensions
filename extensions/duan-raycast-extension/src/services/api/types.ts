export interface CreateLinkRequest {
  short_code: string;
  url: string;
  description?: string | null;
}

export interface CreateLinkResponse {
  message: string;
  short_code: string;
  short_url: string;
  original_url: string;
}

export interface UpdateLinkRequest {
  url?: string;
  is_enabled?: number;
  description?: string | null;
}
