export type ChecklySeverity = "MINOR" | "MEDIUM" | "MAJOR";

export interface ChecklyDayEvent {
  id?: string;
  name?: string;
  duration?: number;
  severity?: ChecklySeverity | string;
  lastUpdateStatus?: string;
  created_at?: string;
}

export interface ChecklyServiceDay {
  date: string;
  events: ChecklyDayEvent[];
}

export interface ChecklyService {
  id: string;
  name: string;
  uptime?: number;
  days?: ChecklyServiceDay[];
}

export interface ChecklyUptimeCard {
  id: string;
  name: string;
  services?: ChecklyService[];
}

export interface ChecklyStatusPageInfo {
  id?: string;
  name?: string;
  customDomain?: string;
  url?: string;
}

export interface ChecklyIncident {
  id?: string;
  name?: string;
  severity?: ChecklySeverity | string;
  lastUpdateStatus?: string;
  status?: string;
  updatedAt?: string;
  created_at?: string;
  createdAt?: string;
  description?: string;
}

export interface ChecklyPayload {
  statusPage?: ChecklyStatusPageInfo;
  incidents: ChecklyIncident[];
  cards: ChecklyUptimeCard[];
}
