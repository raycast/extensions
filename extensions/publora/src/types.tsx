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
