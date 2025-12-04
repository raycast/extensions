import type { Icon } from "@raycast/api";

export type VisibilityScope = "public" | "unlisted" | "direct" | "private" | "local";

// export interface Preference {
//   instance: string;
//   defaultVisibility: VisibilityScope;
//   bookmarkLimit: string;
// }

export interface VisibilityOption {
  title: string;
  value: VisibilityScope;
  icon: Icon;
}

// Error
export interface AkkomaError {
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

// Statuses
interface Poll {
  expired_in: number;
  hide_totals?: boolean | string;
  multiple?: boolean | string | number;
  options: string[];
}

export interface StatusRequest {
  spoiler_text?: string;
  status: string;
  content_type: string;
  visibility: VisibilityScope;
  expires_in?: number;
  in_reply_to_conversation_id?: string;
  in_reply_to_id?: string;
  language?: string;
  media_ids?: string[];
  poll?: Poll;
  preview?: boolean | string | number;
  scheduled_at?: Date;
  sensitive?: string | boolean | number;
  to?: string[];
}

export interface Status {
  created_at: Date;
  media_attachments: UploadAttachResponse[];
  akkoma: AkkomaSource;
  account: {
    acct: string;
  };
  url: string;
  uri: string;
  content: string;
  pleroma: {
    content: {
      "text/plain": string;
    };
  };
  id: string;
  fqn: string;
  reblog: {
    content: string;
    akkoma: AkkomaSource;
  };
}

interface AkkomaSource {
  source: {
    content: string;
    mediaType: "text/markdown" | "text/plain" | "text/bbcode" | "text/html" | "x.misskeymarkdown";
  };
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
  acct: string;
  display_name: string;
  fqn: string;
  avatar_static: string;
  id: string;
}

// Attachments
export interface StatusAttachment {
  file: string;
  description?: string;
  focus?: { x: number; y: number };
}

export interface UploadAttachResponse {
  blurhash: string;
  description: string | null;
  id: string;
  meta: {
    original: {
      aspect: number;
      height: number;
      width: number;
    };
  };
  pleroma: {
    mime_type: string;
  };
  preview_url: string;
  remote_url: string | null;
  text_url: string;
  type: "image" | "video" | "audio" | "unknown";
  url: string;
}
