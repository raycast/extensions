export type VisibilityScope = "public" | "unlisted" | "direct" | "private";

export type LaunchContext = {
  status: Status;
  action: "post" | "edit" | "reply";
};

// Error
export type MastodonError = {
  error: string;
};

// Application and Credentials
type Application = {
  name: string;
  website: string;
};

export type Credentials = {
  client_id: string;
  client_secret: string;
  id: string;
  name: string;
  redirect_uri: string;
  website: string;
  vapid_key: string;
};

export type StatusRequest = {
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
};

export type Status = {
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
};

type Card = {
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
};

export type Account = {
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
};

type Field = {
  name: string;
  value: string;
  verified_at: Date;
};

type Role = {
  id: number;
  name: string;
  color: string;
  permissions: number;
  highlighted: boolean;
};
type CustomEmoji = {
  shortcode: string;
  url: string;
  static_url: string;
  visible_in_picker: boolean;
  category: string;
};

type Report = {
  id: string;
  action_taken: boolean;
  action_taken_at: string | null;
  category: "spam" | "violation" | "other";
  comment: string;
  forwarded: boolean;
  created_at: string;
  status_ids: string[] | null;
  rule_ids: string[] | null;
  target_account: Account;
};

// API Responses
export type ApiResponse = {
  id: number;
  created_at: string;
  text: string;
};

export type StatusResponse = {
  id: string;
  create_at: Date;
  content: string;
  application: Application;
  url: string;
};

// Attachments
export type StatusAttachment = {
  file: string;
  thumbnail?: object;
  description?: string;
  focus?: { x: number; y: number };
};

export type UploadAttachResponse = {
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
};

export type RelationshipSeveranceEvent = {
  id: string;
  type: "domain_block" | "user_domain_block" | "account_suspension";
  purged: boolean;
  target_name: string;
  relationships_count?: number;
  created_at: string;
};

export type Notification = {
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
  account: Account;
  status?: Status;
  report?: Report;
  relationship_severance_event?: RelationshipSeveranceEvent;
};
