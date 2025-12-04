export interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  thumbnail: string;
  featuredImage?: string; // High-quality image from OpenGraph metadata
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  topics: Topic[];
  maker?: User;
  // Additional detailed information
  makers?: User[];
  hunter?: User;
  galleryImages?: string[];
  shoutouts?: Shoutout[];
  weeklyRank?: number;
  dailyRank?: number;
  productHubUrl?: string;
  previousLaunches?: number;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  headline?: string;
  avatarUrl: string;
  profileImage?: string;
  websiteUrl?: string;
  twitterUsername?: string;
  productsCount?: number;
  followersCount?: number;
  profileUrl?: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface ProductsResponse {
  posts: {
    edges: {
      node: Product;
    }[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}

export interface TopicsResponse {
  topics: {
    edges: {
      node: Topic;
    }[];
  };
}

export interface UserResponse {
  user: User;
}

export interface UpcomingProductsResponse {
  upcoming: {
    edges: {
      node: Product;
    }[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}

export interface LaunchArchiveResponse {
  posts: {
    edges: {
      node: Product;
    }[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}

export type TimeRange = "daily" | "weekly" | "monthly" | "yearly";

export interface Shoutout {
  id: string;
  name: string;
  tagline?: string;
  url: string;
  thumbnail?: string;
}
