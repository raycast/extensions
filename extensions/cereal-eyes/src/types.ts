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

export interface SnippetSharePayload {
  type: "link" | "restricted" | "burner";
  access_mode?: "public_link" | "auth_required";
  expires_at?: string;
  max_views?: number;
  recipient_emails?: string[];
}

export interface ApiResponse<T> {
  data: T;
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
