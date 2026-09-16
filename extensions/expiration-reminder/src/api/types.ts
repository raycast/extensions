// Response/request shapes mirrored from ExpirationReminder.API (net8.0) v1 models.
// Field names intentionally match the API's snake_case JSON (including the API's
// `content_legth` typo on attachments).

export interface Category {
  id: string;
  name: string;
  is_active?: boolean;
  team_id?: string;
}

export interface UserRef {
  id: string;
  name?: string;
  email?: string;
}

export interface CustomField {
  id?: string;
  name?: string;
  value?: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  phone?: string;
  timezone?: string;
  type_id?: string;
  team_id?: string;
  is_active?: boolean;
  modified?: string;
}

export interface ExpirationItem {
  id: string;
  name: string;
  expiration_date: string;
  status?: string;
  status_id?: number;
  category?: Category | null;
  category_name?: string;
  details?: string;
  assigned_to?: UserRef | null;
  is_active?: boolean;
  team_id?: string;
  modified?: string;
  contacts?: Contact[];
  custom_fields?: CustomField[];
  contact_id?: string;
}

export interface Attachment {
  id: string;
  name: string;
  content_type?: string;
  created?: string;
  // API typo preserved: byte length of the file.
  content_legth?: number;
  entity_type?: string;
  entity_id?: string;
}

// List envelopes.
export interface ExpirationItemListModel {
  expiration_items: ExpirationItem[];
  pages: number;
  page: number;
  total: number;
}

export interface ContactListModel {
  contacts: Contact[];
  pages: number;
  page: number;
  total: number;
}

export interface CategoryListModel {
  categories: Category[];
  pages: number;
  page: number;
  total: number;
}

export interface AttachmentListModel {
  attachments: Attachment[];
  pages: number;
  page: number;
  total: number;
}

// OAuth token endpoint response.
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: string;
  refresh_token: string;
  scope: string;
  state?: string;
}

export type ExpirationStatus = "current" | "expired" | "notifying" | "archived" | "nodate" | "missing";
