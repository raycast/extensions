export type Project = { name: string; key: string };
export type Issue = { key: string; fields: { summary: string; project?: Project } };
export type PaginationBody = { startAt: number; maxResults: number; total: number };
export type ProjectBody = Project[] | ({ values: Project[]; isLast?: boolean } & PaginationBody);
export type IssueBody = {
  issues: Issue[];
  nextPageToken?: string | null;
  isLast?: boolean;
  startAt?: number;
  total?: number;
};
export type WorklogCommentNode = {
  type: string;
  text?: string;
  attrs?: { text?: string; [key: string]: unknown };
  content?: WorklogCommentNode[];
};
export type WorklogComment = { type: string; version: number; content: WorklogCommentNode[] };
export type Worklog = {
  id: string;
  author: { accountId?: string; name?: string; displayName: string };
  timeSpentSeconds: number;
  comment?: string | WorklogComment;
  started: string;
};
export type WorklogBody = { worklogs: Worklog[] } & PaginationBody;
export type DailyWorklog = { date: Date; entries: WorklogEntry[]; totalSeconds: number };
export type WorklogEntry = { worklog: Worklog; issue: { key: string; summary: string; project: Project } };
