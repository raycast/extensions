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
}

export interface MonitorsState {
  isLoading: boolean;
  items: MonitorItem[];
  error?: any;
}

export interface IncidentItem {
  id: string;
  type: string;
  attributes: IncidentItemAttributes;
}

export interface IncidentItemAttributes {
  name: string;
  url: string;
  http_method: string;
  cause: string;
  started_at: string;
  screenshot_url: string;
  call: boolean;
  sms: boolean;
  email: boolean;
  push: boolean;
}

export interface IncidentsState {
  isLoading: boolean;
  items: IncidentItem[];
  error?: any;
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
}

export interface HeartbeatsState {
  isLoading: boolean;
  items: HeartbeatItem[];
  error?: any;
}
