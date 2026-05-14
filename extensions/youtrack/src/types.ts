export interface NewIssue {
  summary: string;
  description?: string;
  project: {
    id: string;
  };
  tags?: Array<{
    id: string;
    name: string;
  }>;
}

export interface FetchedUser {
  id: string;
  login: string;
  fullName: string;
  avatarUrl: string;
  email: string | null;
}
