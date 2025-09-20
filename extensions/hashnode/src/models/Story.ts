export interface Story {
  id: string;
  cuid: string;
  title: string;
  brief: string;
  slug: string;
  reactionCount: number;
  publishedAt: string;
  author: {
    profilePicture: string;
    username: string;
  };
  url: string;
  publication: {
    title: string;
    url: string;
  };
}
