export interface Timer {
  id: number;
  wid: number;
  pid: number;
  billable: boolean;
  start: string;
  stop: string;
  duration: number;
  description: string;
  tags: Array<string>;
  at: string;
}

export interface Preferences {
  apiToken: string;
}

export interface Project {
  id: number;
  wid: number;
  name: string;
  billable: boolean;
  is_private: boolean;
  active: boolean;
  template: boolean;
  at: string;
  created_at: string;
  color: string;
  auto_estimates: boolean;
  actual_hours: number;
  hex_color: string;
}

export interface Workspace {
  id: number;
  name: string;
  profile: number;
  premium: boolean;
  admin: boolean;
  default_hourly_rate: number;
  default_currency: string;
  only_admins_may_create_projects: boolean;
  only_admins_see_billable_rates: boolean;
  only_admins_see_team_dashboard: boolean;
  projects_billable_by_default: boolean;
  rounding: number;
  rounding_minutes: number;
  api_token: string;
  at: string;
  ical_enabled: boolean;
}

export interface CurrentEntry {
  data: {
    id: number;
    wid: number;
    pid: number;
    billable: boolean;
    start: string;
    duration: number;
    description: string;
    duronly: boolean;
    at: string;
    uid: number;
  };
}

export interface State {
  timers: Array<Timer>;
  workspaces: Array<Workspace>;
  projects: Array<Project>;
  isTokenValid: boolean;
}

export interface NewTimeEntry {
  description: string;
  pid: number;
}

export function isProject(arg: unknown): arg is Array<Project> {
  console.log(arg);
  return true;
}

export function isWorkspace(arg: unknown): arg is Array<Workspace> {
  console.log(arg);
  return true;
}

export function isTimer(arg: unknown): arg is Array<Timer> {
  console.log(arg);
  return true;
}

export function isCurrentEntry(arg: unknown): arg is CurrentEntry {
  console.log(arg);
  return true;
}
