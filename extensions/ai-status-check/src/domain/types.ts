export type Health = "operational" | "degraded" | "partial_outage" | "major_outage" | "maintenance" | "unknown";

export type DataFreshness = "fresh" | "stale" | "expired" | "unavailable";

export type RefreshState = "idle" | "refreshing" | "failed";

export type IncidentState = "investigating" | "identified" | "monitoring" | "resolved" | "scheduled" | "unknown";

export type ProviderCategory = "model-providers" | "routers-and-inference" | "specialized";

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
