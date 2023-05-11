import type { Icon } from "@raycast/api";

export type VisibilityScope = "public" | "unlisted" | "direct" | "private";

export interface Preference {
  instance: string;
  defaultVisibility: VisibilityScope;
  bookmarkLimit: string;
  enableMarkdown: boolean;
}

export interface VisibilityOption {
  title: string;
  value: VisibilityScope;
  icon: Icon;
}

// Error
export interface MastodonError {
  error: string;
}

// Application and Credentials
interface Application {
  name: string;
  website: string;
}

export interface Credentials {
  client_id: string;
  client_secret: string;
  id: string;
  name: string;
  redirect_uri: string;
  website: string;
  vapid_key: string;
}

export interface StatusRequest {
  status: string;
  media_ids?: string[];
  in_reply_to_conversation_id?: string;
  in_reply_to_id?: string;
  sensitive?: boolean;
  spoiler_text?: string;
  visibility: VisibilityScope;
  language?: string;
  scheduled_at?: Date;
  content_type?: "text/markdown" | "text/plain" | "text/html";
}

export interface Status {
  id: string;
  created_at: Date;
  url: string;
  uri: string;
  application: {
    name: string;
    website: string;
  };
  account: Account;
  content: string;
  reblog: {
    id: string;
    reblogged: boolean;
  };
  media_attachments: UploadAttachResponse[];
}

// API Responses
export interface ApiResponse {
  id: number;
  created_at: string;
  text: string;
}

export interface StatusResponse {
  id: string;
  create_at: Date;
  content: string;
  application: Application;
  url: string;
}

export interface Account {
  id: string;
  username: string;
  acct: string;
  display_name: string;
}

// Attachments
export interface StatusAttachment {
  file: string;
  thumbnail?: object;
  description?: string;
  focus?: { x: number; y: number };
}

export interface UploadAttachResponse {
  id: string;
  type: "image" | "video" | "audio" | "unknown";
  url: string;
  preview_url: string;
  remote_url: string | null;
  preview_remote_url: string | null;
  text_url: string;
  meta: {
    focus?: {
      x: number;
      y: number;
    };
    original: {
      aspect: number;
      height: number;
      width: number;
      size: "string";
    };
    small: {
      aspect: number;
      height: number;
      width: number;
      size: "string";
    };
  };
  description: string | null;
  blurhash: string;
}
