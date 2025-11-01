export type LinearNotification =
  | { type: "IssueNotification"; content: LinearIssueNotification }
  | { type: "ProjectNotification"; content: LinearProjectNotification };

export function getLinearNotificationHtmlUrl(notification: LinearNotification): string {
  switch (notification.type) {
    case "IssueNotification":
      return notification.content.issue.url;
    case "ProjectNotification":
      return notification.content.project.url;
  }
}

export interface LinearIssueNotification {
  id: string;
  type: string;
  read_at?: Date;
  updated_at: Date;
  snoozed_until_at?: Date;
  organization: LinearOrganization;
  issue: LinearIssue;
}

export interface LinearOrganization {
  name: string;
  key: string;
  logo_url?: string;
}

export interface LinearIssue {
  id: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  canceled_at?: Date;
  due_date?: Date;
  identifier: string;
  title: string;
  url: string;
  priority: LinearIssuePriority;
  project?: LinearProject;
  project_milestone?: LinearProjectMilestone;
  creator?: LinearUser;
  assignee?: LinearUser;
  state: LinearWorkflowState;
  labels: Array<LinearLabel>;
  description: string;
  team: LinearTeam;
}

export function getLinearIssueHtmlUrl(linearIssue: LinearIssue): string {
  return linearIssue.url;
}

export enum LinearIssuePriority {
  NoPriority = 0,
  Urgent = 1,
  High = 2,
  Normal = 3,
  Low = 4,
}

export interface LinearProject {
  id: string;
  name: string;
  url: string;
  description: string;
  icon?: string;
  color: string;
  state: LinearProjectState;
  progress: number; // percentage between 0 and 100
  start_date?: Date;
  target_date?: Date;
  lead?: LinearUser;
}

export enum LinearProjectState {
  Planned = "Planned",
  Backlog = "Backlog",
  Started = "Started",
  Paused = "Paused",
  Completed = "Completed",
  Canceled = "Canceled",
}

export interface LinearProjectMilestone {
  name: string;
  description?: string;
}

export interface LinearUser {
  name: string;
  avatar_url?: string;
  url: string;
}

export interface LinearWorkflowState {
  name: string;
  description?: string;
  color: string;
  type: LinearWorkflowStateType;
}

export enum LinearWorkflowStateType {
  Triage = "Triage",
  Backlog = "Backlog",
  Unstarted = "Unstarted",
  Started = "Started",
  Completed = "Completed",
  Canceled = "Canceled",
}

export interface LinearLabel {
  name: string;
  description?: string;
  color: string;
}

export interface LinearTeam {
  id: string;
  key: string;
  name: string;
}

export interface LinearProjectNotification {
  id: string;
  type: string;
  read_at?: Date;
  updated_at: Date;
  snoozed_until_at?: Date;
  organization: LinearOrganization;
  project: LinearProject;
}
