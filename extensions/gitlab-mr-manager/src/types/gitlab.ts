export interface Preferences {
  gitlabToken: string;
  gitlabUrl: string;
  projectIds: string;
}

export interface Project {
  id: number;
  name: string;
  path_with_namespace: string;
  description: string;
  web_url: string;
  avatar_url?: string;
}

export interface MergeRequestAuthor {
  name: string;
  username: string;
  avatar_url?: string;
}

export interface MergeRequestAssignee {
  name: string;
  username: string;
}

export interface MergeRequest {
  id: number;
  iid: number;
  title: string;
  description: string;
  state: string;
  created_at: string;
  updated_at: string;
  merged_at?: string;
  target_branch: string;
  source_branch: string;
  author: MergeRequestAuthor;
  assignees: MergeRequestAssignee[];
  web_url: string;
  has_conflicts: boolean;
  work_in_progress: boolean;
  draft: boolean;
}
