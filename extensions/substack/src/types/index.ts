export enum SearchType {
  Posts = "post",
  Profiles = "profile",
}

export type GeneralSearchResult<T> = {
  results: T[];
  more: boolean;
};

export type UseSearch<T> = {
  isLoading: boolean;
  data: T[] | (T[] & never[]);
  pagination:
    | {
        pageSize: number;
        hasMore: boolean;
        onLoadMore: () => void;
      }
    | undefined;
};

export type WithID = {
  _id: string;
};

export enum Language {
  Arabic = "ar",
  Czech = "cs",
  German = "de",
  Greek = "el",
  English = "en",
  Spanish = "es",
  French = "fr",
  Hindi = "hi",
  Hungarian = "hu",
  Indonesian = "id",
  Italian = "it",
  Japanese = "ja",
  Korean = "ko",
  Latin = "la",
  Dutch = "nl",
  Norwegian = "no",
  Polish = "pl",
  Portuguese = "pt",
  Romanian = "ro",
  Russian = "ru",
  Swedish = "sv",
  Thai = "th",
  Turkish = "tr",
  Vietnamese = "vi",
  Chinese = "zh",
}

export type Post = WithID & {
  id: number;
  publication_id: number;
  title: string;
  social_title: string | null;
  type: string;
  slug: string;
  post_date: string;
  audience: string;
  podcast_duration: string | null;
  video_upload_id: string | null;
  podcast_upload_id: string | null;
  write_comment_permissions: string;
  should_send_free_preview: boolean;
  free_unlock_required: boolean;
  default_comment_sort: string | null;
  canonical_url: string;
  section_id: string | null;
  top_exclusions: string[];
  pins: string[];
  is_section_pinned: boolean;
  section_slug: string | null;
  section_name: string | null;
  reactions: Record<string, number>;
  restacked_post_id: string | null;
  restacked_pub_name: string | null;
  restacked_pub_logo_url: string | null;
  position: number;
  subtitle: string;
  cover_image: string;
  cover_image_is_square: boolean;
  cover_image_is_explicit: boolean;
  podcast_url: string;
  videoUpload: string | null;
  podcastFields: {
    post_id: number;
    podcast_episode_number: string | null;
    podcast_season_number: string | null;
    podcast_episode_type: string | null;
    should_syndicate_to_other_feed: string | null;
    syndicate_to_section_id: string | null;
    hide_from_feed: boolean;
    free_podcast_url: string | null;
    free_podcast_duration: string | null;
  };
  podcast_preview_upload_id: string | null;
  podcastUpload: string | null;
  podcastPreviewUpload: string | null;
  voiceover_upload_id: string | null;
  voiceoverUpload: string | null;
  has_voiceover: boolean;
  description: string;
  body_json: string | null;
  body_html: string | null;
  longer_truncated_body_json: string | null;
  longer_truncated_body_html: string | null;
  truncated_body_text: string;
  wordcount: number;
  postTags: {
    id: string;
    publication_id: number;
    name: string;
    slug: string;
    hidden: boolean;
  }[];
  publishedBylines: {
    id: number;
    name: string;
    handle: string;
    previous_name: string | null;
    photo_url: string;
    bio: string;
    profile_set_up_at: string;
    publicationUsers: PublicationUser[];
    is_guest: boolean;
    bestseller_tier: string | null;
  }[];
  reactions_count: number;
  comments_count: number;
  child_comments_count: number;
  audio_items: {
    post_id: number;
    voice_id: string;
    audio_url: string;
    type: string;
    status: string;
  }[];
  hasCashtag: boolean;
};

export type Subscription = {
  id: number;
  name: string;
  subdomain: string;
  custom_domain: string;
  custom_domain_optional: boolean;
  hero_text: string;
  logo_url: string;
  author_id: number;
  theme_var_background_pop: string;
  created_at: string;
  rss_website_url: string;
  email_from_name: string;
  copyright: string;
  founding_plan_name: string;
  community_enabled: boolean;
  invite_only: boolean;
  payments_state: string;
  language: string | null;
  explicit: boolean;
  author: {
    id: number;
    name: string;
    handle: string;
    previous_name: string | null;
    photo_url: string;
    bio: string;
    profile_set_up_at: string;
  };
};

export type PublicationUser = {
  id: number;
  user_id: number;
  publication_id: number;
  role: string;
  public: boolean;
  is_primary: boolean;
  publication: Subscription;
};

export type Profile = WithID & {
  id: number;
  name: string;
  handle: string | null;
  previous_name: string | null;
  photo_url: string;
  bio: string;
  profile_set_up_at: string;
  tos_accepted_at: string | null;
  userLinks: unknown[];
  subscriptionsTruncated: boolean;
  hasGuestPost: boolean;
  primaryPublication: {
    id: number;
    subdomain: string;
    custom_domain: string;
    custom_domain_optional: boolean;
    name: string;
    logo_url: string;
    author_id: number;
    handles_enabled: boolean;
    explicit: boolean;
  };
  publicationUsers: PublicationUser[];
  max_pub_tier: number;
  hasPosts: boolean;
  hasActivity: boolean;
  hasLikes: boolean;
  lists: unknown[];
  rough_num_free_subscribers_int: number;
  rough_num_free_subscribers: string;
  rough_num_subscribers_int: number;
  rough_num_subscribers: string;
  bestseller_badge_disabled: boolean;
  bestseller_tier: number;
  subscriberCountString: string;
  subscriberCount: string;
  hasHiddenPublicationUsers: boolean;
  slug: string;
  previousSlug: string;
  profile_disabled: boolean;
  isSubscribed: boolean;
  isFollowing: boolean;
  followsViewer: boolean;
};

export type WithDetails = {
  detailsShown: boolean;
  toggleDetails: () => void;
};

export type CachedPostResultItem = {
  audience: string;
  cover_image: string;
  post_date: string;
  publication_id: number;
  slug: string;
  subtitle: string;
  title: string;
  truncated_body: string;
  url: string;
};

export type CachedPost = WithID & CachedPostResultItem;

export type CachedPostResult = {
  authors: Array<{
    bio: string;
    handle: string;
    name: string;
    photo_url: string;
    role: string;
    user_id: number;
  }>;
  posts: CachedPostResultItem[];
  recentPosts: CachedPostResultItem[];
};
