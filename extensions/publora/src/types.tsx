export interface Post {
  content: string;
  scheduledTime: Date | null;
  platforms: Platform["platformId"][];
}

export interface Platform {
  platformId: string;
  username: string;
  displayName: string;
  profileImageUrl: string;
}

export type PostStatus = "draft" | "scheduled" | "published" | "failed" | "partially_published";

export interface PublishedPost {
  postGroupId: string;
  content: string;
  status: PostStatus;
  scheduledTime: string | null;
  platforms: { platformId: string; platform: string; status: string }[];
}

export interface PostsPage {
  posts: PublishedPost[];
  pagination: { hasNextPage: boolean };
}
