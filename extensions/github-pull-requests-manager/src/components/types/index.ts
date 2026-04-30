export interface Preferences {
  githubEnterpriseUrl: string;
  githubToken: string;
  filterLabel?: string;
}

export type Category = "wait-for-merge" | "wait-for-change" | "wait-for-review" | "new-review-request" | "in-review";
