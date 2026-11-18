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

export interface OncallShift {
  escalation_policy: {
    id: string;
    summary: string;
    html_url: string;
  };
  schedule?: {
    id: string;
    summary: string;
  };
  user: {
    id: string;
    summary: string;
  };
  start: string; // ISO 8601 timestamp
  end: string; // ISO 8601 timestamp
}

export interface ListOncallsResponse {
  oncalls: OncallShift[];
  limit: number;
  offset: number;
  more: boolean;
}
