export type VisibilityScope = "public" | "unlisted" | "direct" | "private";

export interface Preference {
  instance: string;
  defaultVisibility: VisibilityScope;
  bookmarkLimit: string;
  enableMarkdown: boolean;
}
export interface LaunchContext {
  status: Status;
  action: "post" | "edit" | "reply";
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
  replies_count: number;
  reblogs_count: number;
  favourites_count: number;
  sensitive: boolean;
  spoiler_text: string;
  visibility: VisibilityScope;
  favourited: boolean;
  bookmarked: boolean;
  reblogged: boolean;
  application: {
    name: string;
    website: string;
  };
  account: Account;
  content: string;
  reblog: Status;
  media_attachments: UploadAttachResponse[];
  card: Card;
}

interface Card {
  url: string;
  title: string;
  description: string;
  language: string;
  type: "link" | "photo" | "video" | "rich";
  author_name: string;
  author_url: string;
  provider_name: string;
  provider_url: string;
  html: string;
  width: number;
  height: number;
  image: string | null;
  embed_url: string;
  blurhash: string;
}

export interface Account {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  locked: boolean;
  bot: boolean;
  discoverable: boolean;
  group: boolean;
  created_at: Date;
  note: string;
  url: string;
  avatar: string;
  avatar_static: string;
  header: string;
  header_static: string;
  followers_count: number;
  following_count: number;
  statuses_count: number;
  last_status_at: Date;
  noindex: boolean;
  emojis: CustomEmoji[];
  roles: Role[];
  fields: Field[];
}

interface Field {
  name: string;
  value: string;
  verified_at: Date;
}

interface Role {
  id: number;
  name: string;
  color: string;
  permissions: number;
  highlighted: boolean;
}
interface CustomEmoji {
  shortcode: string;
  url: string;
  static_url: string;
  visible_in_picker: boolean;
  category: string;
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

// Attachments
export interface StatusAttachment {
  file: string;
  thumbnail?: object;
  description?: string;
  focus?: { x: number; y: number };
}

export interface UploadAttachResponse {
  id: string;
  type: "image" | "video" | "audio" | "gifv" | "unknown";
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

export interface RelationshipSeveranceEvent {
  id: string;
  type: "domain_block" | "user_domain_block" | "account_suspension";
  purged: boolean;
  target_name: string;
  relationships_count?: number;
  created_at: string;
}

export interface Notification {
  id: string;
  type:
    | "mention"
    | "status"
    | "reblog"
    | "follow"
    | "follow_request"
    | "favourite"
    | "poll"
    | "update"
    | "admin.sign_up"
    | "admin.report"
    | "severed_relationships";
  created_at: string;
  accout: Account;
  status?: Status;
  report?: Report;
  relationship_severance_event?: RelationshipSeveranceEvent;
}
