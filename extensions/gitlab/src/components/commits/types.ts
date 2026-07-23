import { User } from "../../gitlabapi";

export interface CommitStatus {
  status: string;
  author: User;
  ref?: string;
  allow_failure: boolean;
}

export interface Commit {
  id: string;
  title: string;
  created_at: string;
  message: string;
  author_name: string;
  author_email?: string;
  web_url: string;
  author_avatar_url?: string;
  pipeline_status?: string;
  head_pipeline?: { id: number; iid: string };
}
