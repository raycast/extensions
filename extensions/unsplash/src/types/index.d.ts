interface SearchState<T> {
  results: T extends "collections" ? CollectionResult[] : SearchResult[];
  isLoading: boolean;
}

// Common Types
export type Errors = { errors: string[] };

interface User {
  id: string;
  username: string;
  name: string;
  profile_image: {
    small: string;
    medium: string;
    large: string;
  };
  links: {
    html: string;
  };
}

interface Urls {
  raw: string;
  full: string;
  regular: string;
  small: string;
  thumb: string;
}

// Image Search
interface SearchResult {
  id: number;
  created_at: string;
  title: string;
  width: number;
  height: number;
  likes: number;
  description: string;
  alt_description: string;
  liked_by_user: boolean;
  user: User;
  urls: Urls;
  total_photos?: number;
  links: {
    html: string;
  };
}

// Collection Search
interface CollectionResult {
  id: number;
  title: title;
  description: string;
  published_at: string;
  last_collected_at: string;
  updated_at: string;
  total_photos: number;
  cover_photo: {
    id: string;
    created_at: string;
    width: number;
    height: number;
    color: string;
    likes: number;
    description: string;
    user: User;
    urls: Urls;
    links: {
      html: string;
    };
  };
  user: User;
  links: {
    html: string;
  };
}

// Likes Result
interface LikesResult {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  width: number;
  height: number;
  color: string;
  blur_hash: string;
  likes: number;
  liked_by_user: false;
  description: string;
  user: {
    id: string;
    username: string;
    name: string;
    portfolio_url: string;
    bio: string;
    location: string;
    total_likes: number;
    total_photos: number;
    total_collections: number;
    instagram_username: string;
    twitter_username: string;
    profile_image: {
      small: string;
      medium: string;
      large: string;
    };
    links: {
      html: string;
    };
  };
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  links: {
    html: string;
  };
}

export type Orientation = "all" | "landscape" | "portrait" | "squarish";
