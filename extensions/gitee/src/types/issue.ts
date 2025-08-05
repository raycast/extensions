import { Repository, User } from "./repository";

export interface Issue {
  id: number;
  url: string;
  repository_url: string;
  labels_url: string;
  comments_url: string;
  html_url: string;
  parent_url: null;
  number: string;
  parent_id: number;
  depth: number;
  state: string;
  title: string;
  body: string;
  user: User;
  labels: IssueLabelDetail[];
  assignee: User | null;
  collaborators: User[];
  repository: Repository;
  milestone: null;
  created_at: string;
  updated_at: string;
  plan_started_at: null;
  deadline: null;
  finished_at: null;
  scheduled_time: number;
  comments: number;
  priority: number;
  issue_type: string;
  program: null;
  security_hole: boolean;
  issue_state: string;
  branch: null;
  issue_type_detail: IssueTypeDetail;
  issue_state_detail: IssueStateDetail;
}

export interface IssueStateDetail {
  id: number;
  title: string;
  color: string;
  icon: string;
  command: null;
  serial: number;
  created_at: string;
  updated_at: string;
}

export interface IssueTypeDetail {
  id: number;
  title: string;
  template: null;
  ident: string;
  color: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface IssueLabelDetail {
  id: number;
  color: string;
  name: string;
  repository_id: number;
  url: string;
  created_at: string;
  updated_at: string;
}
