export type SiteProvider =
  | "statuspage"
  | "railway"
  | "incidentio"
  | "betterstack";

export type StatusIndicator = "none" | "minor" | "major" | "critical";

export type ComponentStatusValue =
  | "operational"
  | "degraded_performance"
  | "partial_outage"
  | "major_outage"
  | "under_maintenance";

export interface MonitoredSite {
  id: string;
  name: string;
  url: string;
  provider: SiteProvider;
  createdAt: string;
}

export interface ComponentStatus {
  id: string;
  name: string;
  status: ComponentStatusValue | string;
  uptimePercent?: number;
  historyDays?: DayStatus[];
}

export interface StatusIncident {
  id: string;
  name: string;
  status: string;
  impact: string;
  updatedAt: string;
  body?: string;
  affectedComponentIds?: string[];
}

export interface DayStatus {
  date: string;
  level: "operational" | "degraded" | "partial" | "major" | "unknown";
}

export interface StatusSnapshot {
  pageName: string;
  pageUrl: string;
  overallDescription: string;
  indicator: StatusIndicator;
  components: ComponentStatus[];
  incidents: StatusIncident[];
  historyDays?: DayStatus[];
  uptimePercent?: number;
  fetchedAt: string;
  error?: string;
}

export interface StatusAdapter {
  fetchSnapshot(siteUrl: string): Promise<StatusSnapshot>;
  detect?(siteUrl: string): Promise<boolean>;
}
