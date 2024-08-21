export type CreatePostRequest = {
  title: string;
  content: string;
  projectId: string;
};

export type Post = {
  id: string;
  title: string;
  content: string;
  projectId: string;
  url: string;
};

export type Project = {
  id: string;
  name: string;
  private: boolean;
  general: boolean;
};
