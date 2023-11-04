import { Youtrack } from "youtrack-rest-client";

export interface Issue {
  id: string;
  summary: string;
  date: string;
  created: string;
  resolved: boolean;
  description?: string;
}

export interface Preferences {
  instance: string;
  token: string;
  query: string;
  maxIssues: string;
}

export interface State {
  isLoading: boolean;
  items: Issue[];
  project: string | null;
  error?: Error;
  yt: Youtrack | null;
}

export interface IssueExtended extends Issue {
  reporter: User | undefined;
  updater: User | undefined;
  tags?: IssueTag[];
}

export interface IssueTag {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  fullName: string;
  avatarUrl?: string;
}
