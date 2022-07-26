import { Youtrack } from "youtrack-rest-client";

export interface Issue {
  id: string;
  summary: string;
  date: string;
  resolved: boolean;
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
