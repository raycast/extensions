export interface PullRequest {
  id: number;
  title: string;
  repo: {
    name: string;
    fullName: string;
  };
  commentCount: number;
  author: {
    url: string;
    nickname: string;
  };
}
