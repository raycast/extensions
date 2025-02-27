export type ExistingPost = {
  id: number;
  text: string;
  posts: Post[];
  scheduled_for?: string;
  posted_at?: string;
  url?: string;
};

export type PostGenerateResponse = {
  message: string;
};

export type ExistingPostResponse = {
  items: ExistingPost[];
  total: number;
  page: number;
  perPage: number;
};

export type Post = {
  id: string;
  content: string;
};

export type ExtensionPreferences = {
  token: string;
};

export type CreatePostValues = {
  posts: string;
  accountId: string;
  scheduled_for: Date | null;
  userId: string;
};

export type GeneratePostValues = {
  prompt: string;
  postModelId: string;
  userId: string;
};

export type PostOwlTweet = {
  id: string;
  content: string;
};
