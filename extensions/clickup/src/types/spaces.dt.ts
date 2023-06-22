export interface SpacesResponse {
  spaces: SpaceItem[];
}
export interface SpaceItem {
  id: string;
  name: string;
  private: boolean;
  statuses: StatusesItem[];
  multiple_assignees: boolean;
  features: Features;
  archived: boolean;
}
interface StatusesItem {
  id: string;
  status: string;
  type: string;
  orderindex: number;
  color: string;
}
interface Features {
  due_dates: Due_dates;
  sprints: Sprints;
  time_tracking: Time_tracking;
  points: Points;
  custom_items: Custom_items;
  priorities: Priorities;
  tags: Tags;
  time_estimates: Time_estimates;
  check_unresolved: Check_unresolved;
  zoom: Zoom;
  milestones: Milestones;
  custom_fields: Custom_fields;
  dependency_warning: Dependency_warning;
  multiple_assignees: Multiple_assignees;
  emails: Emails;
}
interface Due_dates {
  enabled: boolean;
  start_date: boolean;
  remap_due_dates: boolean;
  remap_closed_due_date: boolean;
}
interface Sprints {
  enabled: boolean;
}
interface Time_tracking {
  enabled: boolean;
  harvest: boolean;
  rollup: boolean;
}
interface Points {
  enabled: boolean;
}
interface Custom_items {
  enabled: boolean;
}
interface Priorities {
  enabled: boolean;
  priorities: PrioritiesItem[];
}
interface PrioritiesItem {
  id: string;
  priority: string;
  color: string;
  orderindex: string;
}
interface Tags {
  enabled: boolean;
}
interface Time_estimates {
  enabled: boolean;
  rollup: boolean;
  per_assignee: boolean;
}
interface Check_unresolved {
  enabled: boolean;
  subtasks: null;
  checklists: null;
  comments: null;
}
interface Zoom {
  enabled: boolean;
}
interface Milestones {
  enabled: boolean;
}
interface Custom_fields {
  enabled: boolean;
}
interface Dependency_warning {
  enabled: boolean;
}
interface Multiple_assignees {
  enabled: boolean;
}
interface Emails {
  enabled: boolean;
}
