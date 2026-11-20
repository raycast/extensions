// Types for the public Statuspage API behind https://www.vercel-status.com (no token needed).
// Reference: https://www.vercel-status.com/api/v2

export type ComponentStatus =
  "operational" | "degraded_performance" | "partial_outage" | "major_outage" | "under_maintenance";

export type IncidentImpact = "none" | "minor" | "major" | "critical" | "maintenance";

export type IncidentStatus =
  | "investigating"
  | "identified"
  | "monitoring"
  | "resolved"
  | "postmortem"
  | "scheduled"
  | "in_progress"
  | "verifying"
  | "completed";

export interface StatusComponent {
  id: string;
  name: string;
  status: ComponentStatus;
  description: string | null;
  position: number;
  group: boolean;
  group_id: string | null;
  only_show_if_degraded: boolean;
  /** IDs of the child components, only on groups. */
  components?: string[];
}

export interface IncidentUpdate {
  status: IncidentStatus;
  body: string;
  display_at: string;
}

export interface Incident {
  id: string;
  name: string;
  status: IncidentStatus;
  impact: IncidentImpact;
  shortlink: string;
  created_at: string;
  started_at?: string;
  updated_at: string;
  resolved_at: string | null;
  incident_updates: IncidentUpdate[];
  components: StatusComponent[];
}

export interface ScheduledMaintenance extends Incident {
  scheduled_for: string;
  scheduled_until: string;
}

export interface StatusSummary {
  page: { updated_at: string };
  /** The page-wide indicator uses the same scale as an incident's impact. */
  status: { indicator: IncidentImpact; description: string };
  components: StatusComponent[];
  /** Unresolved incidents only. */
  incidents: Incident[];
  /** Upcoming and in-progress maintenance windows. */
  scheduled_maintenances: ScheduledMaintenance[];
}

export interface IncidentHistory {
  /** The 50 most recent incidents, resolved ones included. */
  incidents: Incident[];
}
