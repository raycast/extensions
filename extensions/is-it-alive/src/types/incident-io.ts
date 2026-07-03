import { DayStatus } from "@/types";

export type IncidentIoImpactStatus =
  | "operational"
  | "degraded_performance"
  | "partial_outage"
  | "full_outage";

export interface IncidentIoComponentImpact {
  start_at: string;
  end_at: string | null;
  component_id: string;
  status: IncidentIoImpactStatus;
  status_page_incident_id: string;
}

export interface IncidentIoComponentUptime {
  component_id?: string;
  uptime: string;
  status_page_component_group_id?: string;
}

export interface IncidentIoIncidentLink {
  id: string;
  name: string;
  status: string;
  published_at: string;
}

export interface IncidentIoIncidentUpdate {
  published_at: string;
  message_string?: string;
  to_status?: string;
  component_statuses?: Array<{
    component_id: string;
    status: IncidentIoImpactStatus;
  }>;
}

export interface IncidentIoIncident {
  id: string;
  name: string;
  status: string;
  published_at: string;
  affected_components?: Array<{
    component_id: string;
    status: IncidentIoImpactStatus;
    current_status: IncidentIoImpactStatus;
  }>;
  updates?: IncidentIoIncidentUpdate[];
}

export interface ComponentImpactsResponse {
  incident_links: IncidentIoIncidentLink[];
  component_impacts: IncidentIoComponentImpact[];
  component_uptimes: IncidentIoComponentUptime[];
}

export const STATUS_SEVERITY: Record<IncidentIoImpactStatus, number> = {
  operational: 0,
  degraded_performance: 1,
  partial_outage: 2,
  full_outage: 3,
};

export const DAY_LEVEL_SEVERITY: Record<DayStatus["level"], number> = {
  operational: 0,
  degraded: 1,
  partial: 2,
  major: 3,
  unknown: 0,
};
