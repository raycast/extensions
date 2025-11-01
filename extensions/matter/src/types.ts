export interface Items {
  id: string;
  feed: Item[];
  next: string | null;
  previous: string | null;
  current_profile: { [key: string]: number | boolean | null | string[] | string };
}

export interface Item {
  id: string;
  content: Content;
}

interface Profile {
  id: number;
  profile_type: number;
  domain_photo: string;
}
export interface Library {
  id: number;
  content_id: number;
  library_state: number;
  library_state_date: string;
  modified_date: string;
  feed_dirty_date: string;
  is_favorited: boolean;
}
export interface Content {
  id: number;
  url: string;
  title: string;
  author: Profile;
  publisher: Profile;
  publication_date: string;
  feed_date: string;
  sub_title: string;
  excerpt: string;
  photo_thumbnail_url: string;
  source_type: string;
  article?: {
    word_count: number;
    reading_time_minutes: number;
  };
  library: Library;
}

interface ErrorMessage {
  token_class: string;
  token_type: string;
  message: string;
}
export interface ErrorResponse {
  detail: string;
  code?: string;
  messages?: ErrorMessage[];
}

export enum FeedType {
  "Queue" = 1,
  "Favorites" = 2,
}
