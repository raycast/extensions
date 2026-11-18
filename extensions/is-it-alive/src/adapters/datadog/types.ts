/**
 * Datadog Status Pages serve the full page state as `/config.json` on the
 * custom domain (with a `text/plain` content type).
 */
export type DatadogComponentStatus =
  | "operational"
  | "maintenance"
  | "degraded"
  | "partial_outage"
  | "major_outage";

export interface DatadogComponent {
  id: string;
  name: string;
  type: "Component";
  status: DatadogComponentStatus;
}

export interface DatadogComponentGroup {
  id: string;
  name: string;
  type: "ComponentGroup";
  components: DatadogComponent[];
}

interface DatadogAffectedComponent {
  id: string;
  status: DatadogComponentStatus;
}

/** One status update. The page builds its uptime bars from these. */
export interface DatadogTimelineEntry {
  createdAt: string;
  startedAt?: string;
  componentsAffected?: DatadogAffectedComponent[];
}

export interface DatadogIncident {
  id: string;
  title: string;
  currentStatus: string;
  description?: string;
  lastModifiedAt: string;
  resolved: boolean;
  componentsAffected?: DatadogAffectedComponent[];
  timeline?: DatadogTimelineEntry[];
}

export interface DatadogConfig {
  name: string;
  pageUrl: string;
  created?: string;
  customDomain?: string;
  components: Array<DatadogComponent | DatadogComponentGroup>;
  incidents: DatadogIncident[] | null;
}
