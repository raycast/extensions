import type { JiraIssueTypeName, JiraIssuePriorityName } from "@/types";

export const JIRA_ISSUE_TYPE_NAME = {
  BUG: "Bug",
  TASK: "Task",
  STORY: "Story",
  EPIC: "Epic",
  SUB_TASK: "Sub-task",
} as const;

export const JIRA_ISSUE_TYPE_ICON_MAP = {
  [JIRA_ISSUE_TYPE_NAME.BUG]: "icon-bug.svg",
  [JIRA_ISSUE_TYPE_NAME.TASK]: "icon-task.svg",
  [JIRA_ISSUE_TYPE_NAME.STORY]: "icon-story.svg",
  [JIRA_ISSUE_TYPE_NAME.EPIC]: "icon-epic.svg",
  [JIRA_ISSUE_TYPE_NAME.SUB_TASK]: "icon-subtask.svg",
} as const satisfies Record<JiraIssueTypeName, string>;

/**
 * Note: The values of JIRA_ISSUE_PRIORITY_NAME are all uppercase (e.g. "MAJOR").
 * The Jira API may return priority values in different cases, such as "Major", "MAJOR", or "major".
 * When comparing, always use `priority.toUpperCase()` before comparing with JIRA_ISSUE_PRIORITY_NAME.
 */
export const JIRA_ISSUE_PRIORITY_NAME = {
  BLOCKER: "BLOCKER",
  CRITICAL: "CRITICAL",
  MAJOR: "MAJOR",
  MINOR: "MINOR",
  HIGHEST: "HIGHEST",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  LOWEST: "LOWEST",
  TRIVIAL: "TRIVIAL",
} as const;

export const JIRA_ISSUE_PRIORITY_ICON_MAP = {
  [JIRA_ISSUE_PRIORITY_NAME.BLOCKER]: "icon-priority-blocker.svg",
  [JIRA_ISSUE_PRIORITY_NAME.CRITICAL]: "icon-priority-critical.svg",
  [JIRA_ISSUE_PRIORITY_NAME.MAJOR]: "icon-priority-major.svg",
  [JIRA_ISSUE_PRIORITY_NAME.MINOR]: "icon-priority-minor.svg",
  [JIRA_ISSUE_PRIORITY_NAME.HIGHEST]: "icon-priority-highest.svg",
  [JIRA_ISSUE_PRIORITY_NAME.HIGH]: "icon-priority-high.svg",
  [JIRA_ISSUE_PRIORITY_NAME.MEDIUM]: "icon-priority-medium.svg",
  [JIRA_ISSUE_PRIORITY_NAME.LOW]: "icon-priority-low.svg",
  [JIRA_ISSUE_PRIORITY_NAME.LOWEST]: "icon-priority-lowest.svg",
  [JIRA_ISSUE_PRIORITY_NAME.TRIVIAL]: "icon-priority-trivial.svg",
} as const satisfies Record<JiraIssuePriorityName, string>;

export const JIRA_WORKLOG_RANGE = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
} as const;

export const JIRA_BOARD_TYPE = {
  SCRUM: "scrum",
  KANBAN: "kanban",
} as const;
