export interface Preferences {
  githubToken: string;
  graphqlEndpoint: string;
  extraQuery?: string;
  excludeDrafts?: boolean;
  maxItems?: number;
}

export interface ReviewRequest {
  id: string;
  title: string;
  number: number;
  url: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  authorLogin: string;
  repo: string; // e.g., "owner/name"
}
