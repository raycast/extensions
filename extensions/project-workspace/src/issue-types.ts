import { Color, Icon } from "@raycast/api";

export type IssueStatus = "backlog" | "todo" | "in-progress" | "done" | "cancelled";
export type IssuePriority = "urgent" | "high" | "medium" | "low" | "no-priority";

export interface Issue {
  id: string;
  seq: number;
  title: string;
  description?: string;
  status: IssueStatus;
  priority: IssuePriority;
  labels: string[];
  projectPath?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueLabel {
  name: string;
  color: string;
}

export const ISSUE_STATUSES: IssueStatus[] = ["backlog", "todo", "in-progress", "done", "cancelled"];
export const ISSUE_PRIORITIES: IssuePriority[] = ["urgent", "high", "medium", "low", "no-priority"];

export type IconRef = { source: Icon; tintColor: Color | string };

export const STATUS_CONFIG: Record<IssueStatus, { label: string; icon: IconRef }> = {
  backlog: { label: "Backlog", icon: { source: Icon.Circle, tintColor: Color.SecondaryText } },
  todo: { label: "Todo", icon: { source: Icon.Circle, tintColor: Color.PrimaryText } },
  "in-progress": { label: "In Progress", icon: { source: Icon.Circle, tintColor: Color.Blue } },
  done: { label: "Done", icon: { source: Icon.Checkmark, tintColor: Color.Green } },
  cancelled: { label: "Cancelled", icon: { source: Icon.Xmark, tintColor: Color.Red } },
};

export const PRIORITY_CONFIG: Record<IssuePriority, { label: string; icon: IconRef }> = {
  urgent: { label: "Urgent", icon: { source: Icon.ExclamationMark, tintColor: Color.Red } },
  high: { label: "High", icon: { source: Icon.ArrowUp, tintColor: Color.Orange } },
  medium: { label: "Medium", icon: { source: Icon.Minus, tintColor: Color.Yellow } },
  low: { label: "Low", icon: { source: Icon.ArrowDown, tintColor: Color.Blue } },
  "no-priority": { label: "No Priority", icon: { source: Icon.Circle, tintColor: Color.SecondaryText } },
};

export const DEFAULT_LABELS: IssueLabel[] = [
  { name: "Bug", color: "#FF6B6B" },
  { name: "Feature", color: "#4ECDC4" },
  { name: "Enhancement", color: "#45B7D1" },
  { name: "Documentation", color: "#A8E6CF" },
  { name: "Question", color: "#FFD93D" },
];

export const LABEL_COLOR_OPTIONS = [
  "#FF6B6B",
  "#FF8E53",
  "#FFD93D",
  "#6BCB77",
  "#4ECDC4",
  "#45B7D1",
  "#A29BFE",
  "#FD79A8",
  "#A8E6CF",
  "#DCEDC1",
  "#95A5A6",
  "#BDC3C7",
];
