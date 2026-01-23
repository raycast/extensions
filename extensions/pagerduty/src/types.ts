export interface UpdateIncidentResponse {
  incident: IncidentItem;
}

export interface ListIncidentsResponse {
  incidents: IncidentItem[];
  limit: number;
  offset: number;
  total: number | null;
  more: boolean;
}

export interface GetMeResponse {
  user: {
    id: string;
    email: string;
  };
}

export interface GetMeError {
  error: string;
}

export interface ErrorResponse {
  error: { message: string; code: number; errors: string[] };
}

export type IncidentStatus = "triggered" | "acknowledged" | "resolved";

export interface IncidentItem {
  id: string;
  status: IncidentStatus;
  title: string;
  summary: string;
  incident_number: number;
  created_at: string;
  urgency: "high" | "low";
  html_url: string;
}

export type Filter = "all" | IncidentStatus;

export interface Preferences {
  apiKey: string;
}
