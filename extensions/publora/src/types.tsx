export interface Post {
  content: string;
  scheduledTime: Date;
  platforms: string[];
}

export interface Platform {
  platformId: string;
  username: string;
  displayName: string;
  profileImageUrl: string;
}
