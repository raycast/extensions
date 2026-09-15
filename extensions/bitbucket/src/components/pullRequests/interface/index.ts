export interface PullRequest {
  id: number;
  title: string;
  repo: {
    name: string;
    fullName: string;
    slug: string;
  };
  commentCount: number;
  author: {
    url: string;
    nickname: string;
  };
  state: "OPEN" | "MERGED" | "DECLINED" | "SUPERSEDED";
}
