export interface Issue {
  id: string;
  summary: string;
  date: string;
  created: string;
  resolved: boolean;
  description: string;
  customFields: CustomField[];
  project: Project | null;
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
}

export interface Attachment {
  name: string | null;
  url: string | null;
}

export interface IssueExtended extends Issue {
  reporter: User | null;
  updater: User | null;
  assignee: User | null;
  tags: IssueTag[];
  workItemTypes: WorkItemType[];
  attachments: Attachment[];
}

export interface WorkItemType {
  id: string;
  name: string | null;
  autoAttached?: boolean;
}

export interface IssueTag {
  id: string;
  name: string;
  color: {
    id: string;
    background: string | null;
    foreground: string | null;
  };
}

export interface User {
  id: string;
  login: string;
  fullName: string;
  avatarUrl: string;
  email: string | null;
}

export interface WorkItemSubmit {
  date: Date;
  time: string;
  workTypeId: string;
  comment: string;
}

export interface WorkItem {
  duration: {
    presentation: string;
  };
  date: number;
  type?: WorkItemType;
  text: string;
}

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

export interface Command {
  command: string;
  comment?: string;
  silent?: boolean;
}

export interface ParsedCommand {
  error: boolean | null;
  description: string | null;
}

export interface CommandSuggestions {
  commands: ParsedCommand[];
}

export interface CustomField {
  id: string;
  name: string;
  value: EnumValue | string | number;
}

export interface EnumValue {
  name: string;
  color: {
    background: string | null;
    foreground: string | null;
  } | null;
}

export interface Comment {
  id: string;
  text: string;
  created: number;
  author: User | null;
  attachments: Attachment[];
}
