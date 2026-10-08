/** Status values: "operational", "degraded-performance", "partial-outage", "major-outage", "under-maintenance". */
export interface UptimeComComponent {
  id: number;
  is_group: boolean;
  name: string;
  status: string;
  status_display?: string;
  subcomponents?: UptimeComComponent[];
}

export interface UptimeComAffectedComponent {
  id: number;
  name: string;
  status: string;
  status_display?: string;
}

export interface UptimeComIncidentUpdate {
  id: number;
  updated_at: string;
  description?: string;
  incident_state?: string;
}

export interface UptimeComIncident {
  id: number;
  name: string;
  /** "INCIDENT" | "SCHEDULED_MAINTENANCE" */
  incident_type?: string;
  starts_at?: string;
  ends_at?: string | null;
  affected_components?: UptimeComAffectedComponent[];
  updates?: UptimeComIncidentUpdate[];
  latest_update_description?: string;
  latest_update_incident_state?: string;
}

export interface UptimeComStatusPage {
  name: string;
  global_is_operational?: boolean;
  has_components_under_maintenance_state?: boolean;
  has_components_under_critical_state?: boolean;
  components?: UptimeComComponent[];
  active_incidents?: UptimeComIncident[];
}

/** React props embedded in the page HTML for StatusPageDisplayController. */
export interface UptimeComPageProps {
  siteURL?: string;
  updateHistoryURL?: string;
  statuspage?: UptimeComStatusPage;
}

export interface UptimeComComponentHistory {
  uptime_pct?: number | null;
  outages?: number;
  downtime_secs?: number;
  major_outage?: number;
  partial_outage?: number;
  degraded_performance?: number;
}

export interface UptimeComDayHistory {
  uptime_pct?: number | null;
  outages?: number;
  downtime_secs?: number;
  affected_components?: UptimeComAffectedComponent[];
}

export interface UptimeComHistoryData {
  global_metrics?: { uptime_pct?: number | null };
  component_history?: Record<string, UptimeComComponentHistory>;
  date_history?: Record<string, UptimeComDayHistory>;
  past_incidents?: UptimeComIncident[];
  active_incidents?: UptimeComIncident[];
}

export interface UptimeComHistoryResponse {
  error?: string | null;
  data?: UptimeComHistoryData;
}
