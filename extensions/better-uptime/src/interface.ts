export interface Preferences {
  apiKey: string;
}

export interface MonitorItem {
  id: string;
  type: string;
  attributes: MonitorItemAttributes;
}

export interface MonitorItemAttributes {
  url: string;
  pronounceable_name: string;
  monitor_type: string;
  last_checked_at: string;
  status: string;
  check_frequency: number;
  call: boolean;
  sms: boolean;
  email: boolean;
  push: boolean;
  monitor_group_id: number | null;
  http_method: string | null;
  regions: string[] | null;
}

export interface MonitorsState {
  data: MonitorItem[];
}

export interface IncidentItem {
  id: string;
  type: string;
  attributes: IncidentItemAttributes;
}

export interface IncidentItemAttributes {
  name: string;
  url: string | null;
  http_method: string | null;
  cause: string;
  incident_group_id: number | null;
  started_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  status: string;
  team_name: string;
  response_content: string | null;
  response_options: string | null;
  regions: string[] | null;
  response_url: string | null;
  screenshot_url: string | null;
  origin_url: string | null;
  escalation_policy_id: string | null;
  call: boolean;
  sms: boolean;
  email: boolean;
  push: boolean;
}

export interface IncidentsState {
  data: IncidentItem[];
}

export interface IncidentsResponse {
  data: IncidentItem[];
  pagination: {
    prev: string | null;
    next: string | null;
  };
}

export interface HeartbeatItem {
  id: string;
  type: string;
  attributes: HeartbeatItemAttributes;
}

export interface HeartbeatItemAttributes {
  url: string;
  name: string;
  period: number;
  grace: number;
  call: boolean;
  sms: boolean;
  email: boolean;
  push: boolean;
  status: string;
  heartbeat_group_id: number | null;
}

export interface HeartbeatsState {
  data: HeartbeatItem[];
}

export interface MonitorGroupItem {
  id: string;
  type: string;
  attributes: MonitorGroupItemAttributes;
}

export interface MonitorGroupItemAttributes {
  name: string;
  sort_index: number | null;
  paused: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonitorGroupsState {
  data: MonitorGroupItem[];
}

export interface HeartbeatGroupItem {
  id: string;
  type: string;
  attributes: HeartbeatGroupItemAttributes;
}

export interface HeartbeatGroupItemAttributes {
  name: string;
  sort_index: number | null;
  paused: boolean;
  created_at: string;
  updated_at: string;
}

export interface HeartbeatGroupsState {
  data: HeartbeatGroupItem[];
}
