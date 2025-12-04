export interface MitePreferences {
  miteUrl: string;
  apiKey: string;
}

export interface MiteProject {
  id: number;
  name: string;
  customer_id: number;
  customer_name: string;
  archived: boolean;
  billable: boolean;
  note?: string;
}

export interface MiteService {
  id: number;
  name: string;
  archived: boolean;
  billable: boolean;
  note?: string;
}

export interface MiteTimeEntry {
  id: number;
  minutes: number;
  date_at: string;
  note: string;
  billable: boolean;
  locked: boolean;
  revenue?: number;
  hourly_rate?: number;
  user_id: number;
  user_name: string;
  project_id?: number;
  project_name?: string;
  customer_id?: number;
  customer_name?: string;
  service_id?: number;
  service_name?: string;
  created_at: string;
  updated_at: string;
}

export interface MiteTracker {
  tracking_time_entry?: {
    id: number;
    minutes: number;
    since: string;
  };
  stopped_time_entry?: {
    id: number;
    minutes: number;
  };
}

export interface MiteTimeEntryCreate {
  date_at?: string;
  minutes?: number;
  note?: string;
  project_id?: number;
  service_id?: number;
  user_id?: number;
}
