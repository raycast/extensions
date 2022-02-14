import { AxiosResponse } from "axios";

export interface HarvestCompany {
  base_uri: string;
  full_domain: string;
  name: string;
  is_active: boolean;
  week_start_day: "Saturday" | "Sunday" | "Monday";
  wants_timestamp_timers: boolean;
  time_format: "decimal" | "hours_minutes";
  date_format: "%m/%d/%Y" | "%d/%m/%Y" | "%Y-%m-%d" | "%d.%m.%Y" | "%Y.%m.%d" | "%Y/%m/%d";
  plan_type: string;
  expense_feature: boolean;
  invoice_feature: boolean;
  estimate_feature: boolean;
  team_feature: boolean;
  weekly_capacity: number;
  approval_feature: boolean;
  clock: "12h" | "24h";
  decimal_symbol: string;
  thousands_separator: string;
  color_scheme: string;
}
export interface HarvestCompanyResponse extends AxiosResponse {
  data: HarvestCompany;
}

interface ID_Name {
  id: number;
  name: string;
}
interface ID_Name_Code extends ID_Name {
  code: string;
}

interface UserAssignment {
  id: number;
  project?: ID_Name_Code;
  user?: ID_Name;
  is_active: boolean;
  is_project_manager: boolean;
  use_default_rates?: boolean;
  hourly_rate: number;
  budget: number | null;
  created_at: string;
  updated_at: string;
}
interface TaskAssignment {
  id: number;
  billable: boolean;
  is_active: boolean;
  budget: number | null;
  hourly_rate: number;
  created_at: string;
  updated_at: string;
}

interface HarvestTimeEntry {
  id: integer;
  spent_date: string;
  user: ID_Name;
  user_assignment: UserAssignment;
  client: ID_Name;
  project: ID_Name;
  task: ID_Name;
  task_assignment: TaskAssignment;
  external_reference?: {
    id: string;
    group_id: string;
    account_id: string;
    permalink: string;
    service: string;
    service_icon_url: string;
  };
  invoice: object;
  hours: number;
  hours_without_timer: number;
  rounded_hours: number;
  notes: string;
  is_locked: boolean;
  locked_reason: string;
  is_closed: boolean;
  is_billed: boolean;
  timer_started_at: string;
  started_time: string;
  ended_time: string;
  is_running: boolean;
  billable: boolean;
  budgeted: boolean;
  billable_rate: number;
  cost_rate: number;
  created_at: string;
  updated_at: string;
}

export interface HarvestTimeEntryResponse extends AxiosResponse {
  data: HarvestTimeEntry;
}

export interface HarvestTimeEntriesResponse extends AxiosResponse {
  data: {
    time_entries: HarvestTimeEntry[];
    per_page: number;
    total_pages: number;
    total_entries: number;
    page: number;
    next_page: string | null;
    previous_page: string | null;
    links: {
      first: string;
      next: string | null;
      previous: string | null;
      last: string;
    };
  };
}

interface HarvestClient {
  id: number;
  name: string;
  is_active: boolean;
  address: string;
  statement_key: number;
  created_at: string;
  updated_at: string;
  currency: string;
}
export interface HarvestClientResponse extends AxiosResponse {
  data: HarvestClient;
}
export interface HarvestClientsResponse extends AxiosResponse {
  data: {
    clients: HarvestClient[];
    per_page: number;
    total_pages: number;
    total_entries: number;
    page: number;
    next_page: string | null;
    previous_page: string | null;
    links: {
      first: string;
      next: string | null;
      previous: string | null;
      last: string;
    };
  };
}

export interface HarvestProject {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  bill_by: string;
  budget: number;
  budget_by: string;
  budget_is_monthly: boolean;
  notify_when_over_budget: boolean;
  over_budget_notification_percentage: number;
  over_budget_notification_date: null;
  show_budget_to_all: boolean;
  created_at: string;
  updated_at: string;
  starts_on: string;
  ends_on: null;
  is_billable: boolean;
  is_fixed_fee: boolean;
  notes: string;
  client: {
    id: number;
    name: string;
    currency: string;
  };
  cost_budget: null;
  cost_budget_include_expenses: boolean;
  hourly_rate: number;
  fee: null;
}
export interface HarvestProjectResponse extends AxiosResponse {
  data: HarvestProject;
}
export interface HarvestProjectsResponse extends AxiosResponse {
  data: {
    projects: HarvestProject[];
    per_page: number;
    total_pages: number;
    total_entries: number;
    page: number;
    next_page: string | null;
    previous_page: string | null;
    links: {
      first: string;
      next: string | null;
      previous: string | null;
      last: string;
    };
  };
}

export interface HarvestProjectAssignment {
  id: number;
  is_project_manager: boolean;
  is_active: boolean;
  use_default_rates: boolean;
  budget: null;
  created_at: string;
  updated_at: string;
  hourly_rate: number;
  project: ID_Name_Code;
  client: ID_Name;
  task_assignments: HarvestTaskAssignment[];
}

export interface HarvestTaskAssignment {
  id: number;
  billable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  hourly_rate: number;
  budget: null;
  task: Client;
}
export interface HarvestProjectAssignmentsResponse extends AxiosResponse {
  data: {
    project_assignments: HarvestProjectAssignment[];
    per_page: number;
    total_pages: number;
    total_entries: number;
    page: number;
    next_page: string | null;
    previous_page: string | null;
    links: {
      first: string;
      next: string | null;
      previous: string | null;
      last: string;
    };
  };
}

export interface HarvestTimeEntryCreated {
  id: number;
  spent_date: string;
  user: ID_Name;
  client: ID_Name;
  project: ID_Name;
  task: ID_Name;
  user_assignment: {
    id: number;
    billable?: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    hourly_rate: number;
    budget: null;
    is_project_manager?: boolean;
  };
  task_assignment: {
    id: number;
    billable?: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    hourly_rate: number;
    budget: null;
    is_project_manager?: boolean;
  };
  hours: number;
  hours_without_timer: number;
  rounded_hours: number;
  notes: null;
  created_at: string;
  updated_at: string;
  is_locked: boolean;
  locked_reason: null;
  is_closed: boolean;
  is_billed: boolean;
  timer_started_at: null;
  started_time: string;
  ended_time: string;
  is_running: boolean;
  invoice: null;
  external_reference: null;
  billable: boolean;
  budgeted: boolean;
  billable_rate: number;
  cost_rate: number;
}

export interface HarvestTimeEntryCreatedResponse extends AxiosResponse {
  data: HarvestTimeEntryCreated;
}

export interface HarvestUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  telephone: string;
  timezone: string;
  has_access_to_all_future_projects: boolean;
  is_contractor: boolean;
  is_admin: boolean;
  is_project_manager: boolean;
  can_see_rates: boolean;
  can_create_projects: boolean;
  can_create_invoices: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  weekly_capacity: number;
  default_hourly_rate: number;
  cost_rate: number;
  roles: string[];
  avatar_url: string;
}

export type HarvestUserResponse = {
  data: HarvestUser;
};
