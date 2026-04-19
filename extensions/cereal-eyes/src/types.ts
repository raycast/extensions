export interface Snippet {
  id: string;
  title: string | null;
  content: string;
  language: string | null;
  is_public: boolean;
  has_active_burner_share: boolean;
  expires_at: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SnippetShare {
  id: string;
  snippet_id: string;
  type: "link" | "restricted" | "burner";
  access_mode: "public_link" | "auth_required";
  share_url: string | null;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  remaining_views: number | null;
  is_burned_out: boolean;
  last_viewed_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface ShortUrl {
  id: string;
  code: string;
  short_url: string;
  original_url: string;
  title: string | null;
  is_active: boolean;
  expires_at: string | null;
  is_expired: boolean;
  clicks_total: number;
  last_clicked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShortUrlBreakdownItem {
  value: string | null;
  count: number;
}

export interface ShortUrlClicksByDayItem {
  date: string;
  count: number;
}

export interface ShortUrlAnalytics {
  tier_locked: boolean;
  analytics_level?: "basic" | "full";
  total_clicks?: number;
  clicks_by_day?: ShortUrlClicksByDayItem[];
  by_country?: ShortUrlBreakdownItem[];
  by_device?: ShortUrlBreakdownItem[];
  by_referrer?: ShortUrlBreakdownItem[];
  by_city?: ShortUrlBreakdownItem[];
  by_browser?: ShortUrlBreakdownItem[];
  by_os?: ShortUrlBreakdownItem[];
  by_utm_source?: ShortUrlBreakdownItem[];
  by_utm_medium?: ShortUrlBreakdownItem[];
  by_utm_campaign?: ShortUrlBreakdownItem[];
}

export interface Contact {
  id: string | null;
  display_name: string;
  email: string;
  email_normalized: string;
  is_favorite: boolean;
  is_in_app: boolean;
  linked_user: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  source?: "recent";
  share_count?: number;
  last_shared_at?: string;
}

export interface ContactSuggestions {
  favorites: Contact[];
  contacts: Contact[];
  recent: Contact[];
}

export interface SnippetCreatePayload {
  title?: string;
  content: string;
  language?: string;
  is_public?: boolean;
  expires_at?: string;
}

export interface SnippetUpdatePayload {
  title?: string | null;
  content?: string;
  language?: string | null;
  is_public?: boolean;
  expires_at?: string | null;
}

export interface SnippetSharePayload {
  type: "link" | "restricted" | "burner";
  access_mode?: "public_link" | "auth_required";
  expires_at?: string;
  max_views?: number;
  recipient_emails?: string[];
}

export interface ShortUrlCreatePayload {
  original_url: string;
  title?: string;
  custom_code?: string;
  expires_at?: string;
}

export interface ShortUrlUpdatePayload {
  title?: string | null;
  is_active?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiListResponse<T> {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
