import { Color, Icon, Keyboard } from "@raycast/api";

import { AppBskyEmbedRecord } from "@atproto/api";
import { ReplyRef } from "@atproto/api/dist/client/types/app/bsky/feed/post";
import { ViewerState } from "@atproto/api/dist/client/types/app/bsky/actor/defs";

export type BskyRecord = {
  text: string;
  createdAt: string;
};

export type SessionCreatedResultMessage =
  | "new-session-created"
  | "resuming-existing-session"
  | "session-creation-failed";

export type ATSessionResponse = {
  status: SessionCreatedResultMessage;
  message?: string;
};

export type User = {
  did: string;
  handle: string;
  displayName: string;
  avatarUrl: string;
  muted?: boolean;
  following?: boolean;
  description?: string;
};

type PostMetrics = {
  likeCount: number;
  replyCount: number;
  repostCount: number;
};

export type ReplyToReference = {
  reason: "reply";
  replyToText: string;
  replyRef: ReplyRef;
  replyToAuthor: string;
};

export type QuotePostReference = {
  reason: "quote";
  quotedFromAuthor: string;
  originalPostText: string;
  quotedRef: AppBskyEmbedRecord.Main;
};

export type PostReference = ReplyToReference | QuotePostReference;

export type Post = {
  uri: string;
  cid: string;
  text: string;
  createdAt: string;
  createdByUser: User;
  metrics: PostMetrics;
  viewer?: ViewerState;
  markdownView: string;
  likeUri: string;
  imageEmbeds?: string[];
};

export type CredentialsHashStore = {
  key: string;
};

export type Notification = {
  uri: string;
  id: string;
  text: string;
  reason: string;
  author: User;
  indexedAtDate: string;
  targetPostUri: string | null;
};

export type SectionType = {
  id: string;
  getName: () => string;
};

export type ViewType = {
  id: string;
  getName: () => string;
  sectionId: string;
  icon: Icon;
  description: string;
  hideInHomeView?: boolean;
};

export type NewPost = {
  postText: string;
};

export type ActionProperty = {
  getTitle: () => string;
  icon: Icon;
  color: Color;
  shortcut: Keyboard.Shortcut;
};

export type AllowedActionKeys =
  | "homeView"
  | "timelineView"
  | "notificationView"
  | "createPostView"
  | "searchView"
  | "recentPostsView"
  | "aboutView"
  | "follow"
  | "unfollow"
  | "mute"
  | "viewAsList"
  | "viewAsGrid"
  | "unmute"
  | "like"
  | "unlike"
  | "repost"
  | "quote"
  | "reply"
  | "switchToHomeView"
  | "openProfile"
  | "openProfileInBrowser"
  | "openPostInBrowser";

export type ActionsDictionary = {
  [K in AllowedActionKeys]: ActionProperty;
};

type NavigateToViewTypes = "About";

export type HomeLaunchContext = {
  navigateTo: NavigateToViewTypes;
};
