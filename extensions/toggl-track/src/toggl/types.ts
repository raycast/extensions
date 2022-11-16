export interface Workspace {
  id: number;
  name: string;
  premium: boolean;
  admin: boolean;
  default_hourly_rate: number;
  default_currency: string;
  only_admins_may_create_projects: boolean;
  only_admins_see_billable_rates: boolean;
  rounding: number;
  rounding_minutes: number;
  at: Date;
  logo_url: string;
}

export interface Project {
  id: number;
  wid: number;
  cid: number;
  name: string;
  billable: boolean;
  is_private: boolean;
  active: boolean;
  template: boolean;
  at: Date;
  created_at: Date;
  color: string;
  auto_estimates: boolean;
  actual_hours: number;
  hex_color: string;
}

export interface TimeEntry {
  id: number;
  pid: number;
  wid: number;
  billable: boolean;
  start: Date;
  duration: number;
  description: string;
  tags: string[];
}

export interface Client {
  id: number;
  name: string;
}

export interface Tag {
  id: number;
  wid: number;
  name: string;
}
