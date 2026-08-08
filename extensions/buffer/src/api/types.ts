// ── Organizations & Channels ─────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
}

export interface Channel {
  id: string;
  name: string;
  service: string;
  /** e.g. "page" / "group" for Facebook, "profile" for Instagram. Used to distinguish channel subtypes that share the same service. */
  type?: string;
  isLocked?: boolean;
  isDisconnected?: boolean;
}

export interface PinterestBoard {
  serviceId: string;
  name: string;
}

// ── Ideas ────────────────────────────────────────────────────────────────────

export interface CreateIdeaInput {
  organizationId: string;
  title?: string;
  text?: string;
}

export interface CreatedIdea {
  id: string;
  organizationId: string;
  createdAt: string;
  content: {
    title?: string;
    text?: string;
  };
}

// ── Posts ────────────────────────────────────────────────────────────────────

export type PostMode =
  | "addToQueue"
  | "shareNow"
  | "shareNext"
  | "customScheduled";

export type SchedulingType = "automatic" | "notification";

export interface ImageAssetInput {
  url: string;
  thumbnailUrl?: string;
  metadata?: {
    altText: string;
    dimensions?: { width: number; height: number };
    userTags?: { handle: string; x: number; y: number }[];
  };
}

export interface VideoAssetInput {
  url: string;
  thumbnailUrl?: string;
  metadata?: {
    thumbnailOffset?: number;
    title?: string;
  };
}

export interface DocumentAssetInput {
  url: string;
  title: string;
  thumbnailUrl: string;
}

export interface LinkAssetInput {
  url: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
}

/** Exactly one variant must be provided per asset. */
export interface AssetInput {
  image?: ImageAssetInput;
  video?: VideoAssetInput;
  document?: DocumentAssetInput;
  link?: LinkAssetInput;
}

// ── Service-specific post metadata ──────────────────────────────────────────

export type GoogleBusinessButton =
  | "none"
  | "book"
  | "order"
  | "shop"
  | "learn_more"
  | "signup"
  | "call";

export interface InstagramMetadata {
  type: "post" | "story" | "reel";
  shouldShareToFeed?: boolean;
  firstComment?: string;
  link?: string;
}

export interface FacebookMetadata {
  type: "post" | "story" | "reel";
  firstComment?: string;
  /** Mutually exclusive with non-empty assets. */
  linkAttachment?: { url: string };
}

export interface GoogleBusinessMetadata {
  type: "whats_new" | "offer" | "event";
  title?: string;
  detailsWhatsNew?: {
    button?: GoogleBusinessButton;
    link?: string;
  };
  detailsOffer?: {
    title: string;
    startDate: string;
    endDate: string;
    code?: string;
    link?: string;
    terms?: string;
  };
  detailsEvent?: {
    title: string;
    startDate: string;
    endDate: string;
    isFullDayEvent: boolean;
    button?: GoogleBusinessButton;
    link?: string;
  };
}

export type YoutubePrivacy = "public" | "private" | "unlisted";
export type YoutubeLicense = "youtube" | "creativeCommon";

export interface YoutubeMetadata {
  title: string;
  categoryId: string;
  privacy: YoutubePrivacy;
  license: YoutubeLicense;
  madeForKids: boolean;
  embeddable: boolean;
  notifySubscribers: boolean;
}

export interface PinterestMetadata {
  boardServiceId: string;
  title?: string;
  url?: string;
}

export interface PostMetadata {
  instagram?: InstagramMetadata;
  facebook?: FacebookMetadata;
  google?: GoogleBusinessMetadata;
  youtube?: YoutubeMetadata;
  pinterest?: PinterestMetadata;
}

export interface CreatePostInput {
  channelId: string;
  text?: string;
  mode: PostMode;
  schedulingType?: SchedulingType;
  dueAt?: string;
  /** Ordered list of assets on this post. */
  assets?: AssetInput[];
  metadata?: PostMetadata;
}

export interface CreatedPost {
  id: string;
  status: string;
  text?: string;
  dueAt?: string;
  sentAt?: string;
  createdAt: string;
  channelId: string;
  channelService: string;
  shareMode: string;
  externalLink?: string;
}
