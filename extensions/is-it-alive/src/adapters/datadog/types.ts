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

export interface DatadogIncident {
  id: string;
  title: string;
  currentStatus: string;
  description?: string;
  lastModifiedAt: string;
  resolved: boolean;
  componentsAffected?: Array<{ id: string; status: DatadogComponentStatus }>;
}

export interface DatadogConfig {
  name: string;
  pageUrl: string;
  customDomain?: string;
  components: Array<DatadogComponent | DatadogComponentGroup>;
  incidents: DatadogIncident[] | null;
}
