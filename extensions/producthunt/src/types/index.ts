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
  // The user who created/submitted the post (Post.user in the API: "User who created the Post").
  // This is a documented, distinct role — NOT a maker and not a guaranteed "hunter" — so it is
  // modeled and labeled separately ("Posted by") rather than conflated with maker/hunter.
  submittedBy?: User;
  galleryImages?: string[];
  weeklyRank?: number;
  dailyRank?: number;
  productHubUrl?: string;
  previousLaunches?: number;
  // True when this product came from the token-free Atom feed (limited data: no real votes,
  // comments, makers, or thumbnails). UI uses this to suppress empty stats and prefer opening
  // the launch in the browser over the (thin) in-app detail view.
  isFeedFallback?: boolean;
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
