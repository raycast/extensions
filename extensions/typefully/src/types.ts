export type Draft = {
  id: number;
  text: string;
  text_first_tweet: string;
  num_tweets: number;
  scheduled_date?: string;
  published_on?: string;
  share_url?: string;
  twitter_url?: string;
};

export type ExtensionPreferences = {
  token: string;
};

export type CreateDraftValues = {
  content: string;
  threadify: boolean;
  scheduleDate: Date | null;
  shareOptions: string;
};

export type Tweet = {
  id: number;
  text_first_tweet: string;
  published_on: Date;
  twitter_url: string;
};

export type NotificationsResponse = {
  accounts: Record<number, Account>;
  notifications: Record<number, { inbox: InboxNotification[]; activity: ActivityNotification[] }>;
};

export type NotificationUser = {
  screen_name: string;
  profile_image_url: string;
  name: string;
};

export type Account = NotificationUser & {
  id: number;
};

export type Notification = {
  id: number;
  created_at: string;
  kind: "inbox" | "activity";
  user: Omit<Account, "id">;
  account: Account;
  payload: NotificationPayload;
  url: string;
};

export type ActivityNotification = Notification & {
  kind: "activity";
  payload:
    | AutoPlugPublishedPayload
    | AutoRetweetPublishedPayload
    | DraftPublishedPayload
    | ScheduledDraftPublishedPayload;
};

export type InboxNotification = Notification & {
  kind: "inbox";
  author: Omit<Account, "id">;
  payload: NewReplyPayload | NewCommentPayload;
};

export type NotificationPayload =
  | NewReplyPayload
  | NewCommentPayload
  | AutoPlugPublishedPayload
  | AutoRetweetPublishedPayload
  | DraftPublishedPayload
  | ScheduledDraftPublishedPayload;

export type NewReplyPayload = {
  action: "new_reply";
  draft_id: number;
  draft_share_id?: string;
  shared_draft?: boolean;
  reply_text: string;
  comment_text: string;
  comment_author: NotificationUser;
  comment_stack_id: string;
  reply_id: string;
};

export type NewCommentPayload = {
  action: "new_comment";
  draft_id: number;
  draft_share_id?: string;
  tweet_id: string;
  comment_stack_id: string;
  quoted_text: string;
  comment_text: string;
};

export type AutoPlugPublishedPayload = {
  action: "auto_plug_published";
  draft_id: number;
  success: boolean;
  first_tweet_text: string;
  num_tweets: number;
  tweet_url: string;
  auto_plug_tweet_url: string;
  scheduled: boolean;
  auto_plug_text: string;
};

export type AutoRetweetPublishedPayload = {
  action: "auto_retweet_published";
  draft_id: number;
  success: boolean;
  first_tweet_text: string;
  num_tweets: number;
  tweet_url: string;
  scheduled: boolean;
};

export type DraftPublishedPayload =
  | {
      action: "draft_published";
      draft_id: number;
      success: true;
      tweet_url: string;
      platform: "twitter";
      first_tweet_text: string;
      num_tweets: number;
    }
  | {
      action: "draft_published";
      draft_id: number;
      success: false;
      error: string;
    };

export type ScheduledDraftPublishedPayload =
  | {
      action: "scheduled_draft_published";
      draft_id: number;
      success: true;
      tweet_url: string;
      platform: "twitter";
      first_tweet_text: string;
      num_tweets: number;
    }
  | {
      action: "scheduled_draft_published";
      draft_id: number;
      success: false;
      error: string;
    };
