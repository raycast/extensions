import { WorkItemType, Youtrack } from "youtrack-rest-client";

export interface Issue {
  id: string;
  summary: string;
  date: string;
  created: string;
  resolved: boolean;
  description?: string;
}

export interface Project {
  id: string;
  shortName: string;
  name: string;
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
  assignee: User | undefined;
  tags?: IssueTag[];
  workItemTypes?: WorkItemType[];
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

export interface WorkItemSubmit {
  date: Date;
  time: string;
  workTypeId: string;
  comment: string;
}
