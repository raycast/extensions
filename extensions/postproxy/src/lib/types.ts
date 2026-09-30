/**
 * Trimmed Postproxy API types.
 * Field names verified against the Rails jbuilder views in app/app/views/api/*.
 */

export interface ProfileGroup {
  id: string;
  name: string;
  profiles_count: number;
}

export interface Profile {
  id: string;
  name: string;
  platform: string;
  status?: string;
  profile_group_id: string;
  expires_at: string | null;
  post_count: number;
  avatar_url?: string | null;
}

export interface Placement {
  id: string | null;
  name: string;
  metadata?: Record<string, unknown> | null;
}

export interface StatsRecord {
  stats: Record<string, number>;
  recorded_at: string;
}

export interface ProfileStatsResponse {
  data: {
    profile_id: string;
    platform: string;
    placement_id: string | null;
    records: StatsRecord[];
  };
}

export type PostStatus = "draft" | "pending" | "processing" | "processed" | "scheduled" | "media_processing_failed";

export interface PlatformOutcome {
  platform: string;
  status: "pending" | "processing" | "published" | "failed" | "deleted";
  params?: Record<string, unknown>;
  attempted_at: string | null;
  permalink?: string | null;
  insights?: { impressions?: number | null; on?: string } | null;
  url?: string;
  post_id?: string;
  error?: string | null;
}

export interface MediaAttachment {
  id: string;
  status: string;
  content_type: string | null;
  source_url: string | null;
  url: string | null;
}

export interface Post {
  id: string;
  body?: string;
  content?: string;
  status: PostStatus;
  draft: boolean;
  scheduled_at: string | null;
  created_at: string;
  updated_at?: string;
  media?: MediaAttachment[];
  platforms: PlatformOutcome[];
}

/** Response of GET /posts/stats?post_ids=... — keyed by post id. */
export interface PostStatsResponse {
  data: Record<
    string,
    {
      platforms: Array<{
        profile_id: string;
        platform: string;
        records: Array<{ stats: Record<string, number>; recorded_at: string }>;
      }>;
    }
  >;
}

export interface Comment {
  id: string;
  external_id: string | null;
  body: string;
  status: string;
  author_username: string | null;
  author_avatar_url: string | null;
  parent_external_id: string | null;
  like_count: number;
  is_hidden: boolean;
  permalink: string | null;
  posted_at: string | null;
  created_at: string;
  replies?: Comment[];
}

/** Response of GET /summary — the "what's the status?" activity snapshot. */
export interface SummaryResponse {
  window: {
    label: string | null;
    from: string;
    to: string;
    previous_from: string | null;
    backlog_from: string;
  };
  posts: {
    published: number;
    published_previous: number | null;
    failed: number;
    scheduled_ahead: number;
    next_scheduled_at: string | null;
    by_platform: Record<string, { published: number; failed: number }>;
  };
  engagement: {
    total: Record<string, number>;
    by_platform: Record<string, Record<string, number>>;
    posts_with_insights: number;
    insights_capped_at?: number;
  } | null;
  comments: {
    received: number;
    received_previous: number | null;
    awaiting_reply: number;
    by_platform: Record<string, number>;
  };
  reviews: {
    received: number;
    received_previous: number | null;
    awaiting_reply: number;
  };
  dms: {
    inbound: number;
    outbound: number;
    chats_awaiting_reply: number;
    reply_window_closing: number;
  } | null;
  api: {
    calls: number;
    calls_previous: number | null;
  };
}

/** Profile-scoped comment — Google Business reviews and your replies to them. */
export interface ProfileComment {
  id: string;
  external_id: string | null;
  parent_external_id: string | null;
  placement_id: string | null;
  body: string;
  status: string;
  error?: string | null;
  author_username: string | null;
  author_avatar_url: string | null;
  permalink: string | null;
  posted_at: string | null;
  created_at: string;
  replies?: ProfileComment[];
}

export interface Chat {
  id: string;
  profile_id: string;
  platform: string;
  participant_external_id: string | null;
  participant_username: string | null;
  participant_name: string | null;
  participant_avatar_url: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  last_message_at: string | null;
  created_at: string;
}

export interface MessageReaction {
  sender_external_id: string;
  emoji: string | null;
  reaction: string | null;
  at: string | null;
}

export interface Message {
  id: string;
  chat_id: string;
  external_id: string | null;
  direction: "inbound" | "outbound";
  body: string | null;
  status: string;
  error_message?: string | null;
  reply_to_external_id: string | null;
  reactions: MessageReaction[];
  external_posted_at: string | null;
  created_at: string;
}
