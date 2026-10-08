// DTF API Types

export interface ApiResponse<T> {
  message: string;
  result: T;
  error?: {
    code: number;
    info: unknown[];
  };
}

export interface ImageData {
  type: "image";
  data: {
    uuid: string;
    width: number;
    height: number;
    size: number;
    type: string;
    color: string;
    hash: string;
    external_service: unknown[];
    base64preview?: string;
  };
}

export interface Author {
  id: number;
  name: string;
  nickname: string | null;
  description: string | null;
  uri: string;
  avatar: ImageData | null;
  isSubscribed: boolean;
  isPlus: boolean;
  isVerified: boolean;
  isPro: boolean;
  type: number;
  subtype: string;
}

export interface Subsite {
  id: number;
  name: string;
  description: string;
  uri: string;
  avatar: ImageData | null;
  cover: ImageData | null;
  isSubscribed: boolean;
  nickname: string;
  type: number; // 1 = user blog, 2 = official subsite
  subtype: string;
}

export interface PostCounters {
  comments: number;
  favorites: number;
  reposts: number;
  views: number;
  hits: number;
  reads: number | null;
  online: number;
}

export interface PostLikes {
  counterLikes: number;
  counterDislikes: number | null;
  isLiked: number;
  isHidden: boolean;
}

// Media item for images/videos/galleries
export interface MediaItem {
  title?: string;
  image?: {
    type: "image";
    data: {
      uuid: string;
      width: number;
      height: number;
      size: number;
      type: string;
      color: string;
      hash: string;
      external_service: unknown[];
      base64preview?: string;
      duration?: number;
      isVideo?: boolean;
      has_audio?: boolean;
    };
  };
}

// Link block data
export interface LinkBlockData {
  type: "link";
  data: {
    url: string;
    title?: string;
    description?: string;
    hostname?: string;
    image?: ImageData;
  };
}

// Audio block data
export interface AudioBlockData {
  type: "audio";
  data: {
    uuid: string;
    filename: string;
    size: number;
    audio_info: {
      bitrate: number;
      duration: number;
      channel: string;
      framesCount: number;
      format: string;
      listens_count: number;
    };
  };
}

// Video external service
export interface VideoExternalService {
  name: string;
  id: string;
}

// Video block data
export interface VideoBlockData {
  type: "video";
  data: {
    thumbnail?: {
      data: {
        uuid: string;
      };
    };
    external_service?: VideoExternalService;
  };
}

// Embedded Osnova author (simplified)
export interface EmbedAuthor {
  id: number;
  name: string;
  avatar?: ImageData | null;
}

// Embedded Osnova subsite (simplified)
export interface EmbedSubsite {
  id: number;
  name: string;
  avatar?: ImageData | null;
}

// Post block data union
export interface PostBlockData {
  // text, header
  text?: string;
  style?: "h2" | "h3";

  // media - MediaItem[] for images/videos/galleries
  // list - string[] for list items
  // quiz - Record<string, string> for options
  items?: string[] | MediaItem[] | Record<string, string>;

  // list
  type?: "UL" | "OL" | "default";

  // link
  link?: LinkBlockData;

  // quote
  subline1?: string;

  // code
  lang?: string;

  // audio
  audio?: AudioBlockData;
  image?: ImageData | null;
  hash?: string;

  // quiz
  title?: string;
  is_public?: boolean;
  uid?: string;

  // person
  description?: string;

  // video
  video?: VideoBlockData;

  // osnovaEmbed - embedded post from DTF/Osnova
  original_id?: number;
  isNotAvailable?: boolean;
  isEditorial?: boolean;
  url?: string;
  blocks?: PostBlock[];
  date?: number;
  author?: EmbedAuthor;
  subsite?: EmbedSubsite;
  likes?: number;
  comments?: number;
  isBlur?: boolean;
  warningFromEditor?: string | null;
  warningFromEditorTitle?: string | null;
}

// Helper function to safely get media items from block data
export function getMediaItems(items: PostBlockData["items"]): MediaItem[] | undefined {
  if (!items || !Array.isArray(items)) return undefined;
  // Check if it's MediaItem[] (has image property) or string[]
  if (items.length === 0) return [];
  if (typeof items[0] === "object" && "image" in items[0]) {
    return items as MediaItem[];
  }
  return undefined;
}

export type PostBlockType =
  | "text"
  | "header"
  | "media"
  | "link"
  | "quote"
  | "list"
  | "code"
  | "delimiter"
  | "audio"
  | "quiz"
  | "person"
  | "video"
  | "incut"
  | "osnovaEmbed";

export interface PostBlock {
  type: PostBlockType;
  cover: boolean;
  hidden: boolean;
  anchor: string;
  data: PostBlockData;
}

export interface Post {
  id: number;
  customUri: string;
  subsiteId: number;
  title: string;
  date: number;
  dateModified: number;
  blocks: PostBlock[];
  counters: PostCounters;
  likes: PostLikes;
  author: Author;
  subsite: Subsite;
  url: string;
  isNews?: boolean;
  isFavorited: boolean;
  isPinned: boolean;
  isEditorial: boolean;
  isPublished: boolean;
}

export interface TimelineItem {
  type: "entry";
  data: Post;
}

export interface TimelineResult {
  items: TimelineItem[];
  lastId?: number;
  lastSortingValue?: number;
  cursor?: string;
}

export interface NewsResult {
  news: Post[];
  lastId?: number;
}

export interface SearchResult {
  items: TimelineItem[];
  subsites?: {
    users: Subsite[];
    subsites: Subsite[];
  };
}

// Discovery Topics API response
export interface TopicSubsite {
  id: number;
  uri: string;
  url: string;
  type: number;
  subtype: string;
  name: string;
  nickname: string | null;
  description: string;
  avatar: ImageData | null;
  cover: ImageData | null;
  isSubscribed: boolean;
  isVerified: boolean;
  counters: {
    subscribers: number;
    subscriptions: number;
    entries: number;
    comments: number;
  };
}

export interface TopicItem {
  data: TopicSubsite;
  meta: {
    prevRank: number | null;
    rank: number;
  };
}

export interface TopicsResult {
  message: string;
  result: TopicItem[];
}

// Discovery Blogs API response
export interface BlogData {
  id: number;
  uri: string;
  url: string;
  type: number;
  subtype: string;
  name: string;
  nickname: string | null;
  description: string;
  avatar: ImageData | null;
  cover: ImageData | null;
  badge: string | null;
  badgeId: string | null;
  isSubscribed: boolean;
  isVerified: boolean;
  isCompany: boolean;
  isPlus: boolean;
  isDisabledAd: boolean;
  isPro: boolean;
  isOnline: boolean;
  isMuted: boolean;
  isUnsubscribable: boolean;
  isSubscribedToNewPosts: boolean;
  isAvailableForMessenger: boolean;
  isFrozen: boolean;
  isRemovedByUserRequest: boolean;
  coverY: number;
  lastModificationDate: number;
  isDonationsEnabled: boolean;
  isPlusGiftEnabled: boolean;
  counters: {
    subscribers: number;
    subscriptions: number;
    achievements: number;
    entries: number;
    comments: number;
  };
  count_stats_7d: number;
  rank: number;
}

export interface BlogItem {
  data: BlogData;
  meta: {
    prevRank: number | null;
    rank: number;
  };
}

export interface BlogsApiResponse {
  message: string;
  result: BlogItem[];
}

// Simplified Post for display
export interface DisplayPost {
  id: number;
  title: string;
  url: string;
  date: Date;
  author: {
    name: string;
    avatar?: string;
  };
  subsite: {
    id: number;
    name: string;
    avatar?: string;
  };
  stats: {
    views: number;
    comments: number;
    likes: number;
  };
  coverImage?: string;
  excerpt?: string;
  blocks?: PostBlock[]; // Full post content
}
