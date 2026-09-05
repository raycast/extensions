export type Health = "operational" | "degraded" | "partial_outage" | "major_outage" | "maintenance" | "unknown";

export type DataFreshness = "fresh" | "stale" | "expired" | "unavailable";

export type RefreshState = "idle" | "refreshing" | "failed";

export type IncidentState = "investigating" | "identified" | "monitoring" | "resolved" | "scheduled" | "unknown";

export type ProviderCategory = "model-providers" | "routers-and-inference" | "specialized";

export type ComponentHistoryLevel =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "maintenance"
  | "informational"
  | "not_monitored"
  | "unknown";

export interface ComponentHistoryDay {
  date: string;
  level: ComponentHistoryLevel;
}

export interface ComponentHistory {
  /** Number of calendar days represented by the provider's published history. */
  windowDays: number;
  /** Whether the source publishes availability measurements or an incident calendar. */
  basis: "availability" | "incidents";
  days: ComponentHistoryDay[];
  /** Present only when the provider publishes or precisely measures this value. */
  uptimePercent?: number;
  /** Source-faithful percentage text, including provider-specific precision. */
  uptimeText?: string;
  /** First date for which the provider says monitoring data is available. */
  monitoredSince?: string;
}

export interface IncidentUpdate {
  id: string;
  state: IncidentState;
  stateText?: string;
  body: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  title: string;
  health: Health;
  state: IncidentState;
  stateText?: string;
  impactText?: string;
  startedAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
  affectedComponentIds: string[];
  updates: IncidentUpdate[];
  url?: string;
}

export interface ComponentStatus {
  id: string;
  name: string;
  group?: string;
  health: Health;
  statusText?: string;
  url?: string;
  history?: ComponentHistory;
}

export interface ProviderSnapshot {
  providerId: string;
  health: Health;
  statusText?: string;
  components: ComponentStatus[];
  incidents: Incident[];
  fetchedAt: string;
}

export interface ProviderStatusRecord {
  providerId: string;
  snapshot?: ProviderSnapshot;
  freshness: DataFreshness;
  refreshState: RefreshState;
  refreshError?: string;
}
