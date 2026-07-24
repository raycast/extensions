/** The kind of status backend a service exposes. Each maps to a provider in `providers/index.ts`. */
export type ProviderKind = "statuspage" | "slack" | "gcp" | "aws";

export interface Service {
  id: string;
  name: string;
  category: string;
  /** Base URL of the status site, e.g. https://www.githubstatus.com (no trailing slash). */
  statusUrl: string;
  provider: ProviderKind;
}

/** Normalized severity, aligned with Statuspage's status.indicator values plus an `unknown` fallback. */
export type Indicator = "none" | "minor" | "major" | "critical" | "maintenance" | "unknown";

export interface Component {
  id: string;
  name: string;
  /** Raw component status, e.g. "operational", "degraded_performance", "major_outage". */
  status: string;
}

export interface IncidentUpdate {
  /** investigating | identified | monitoring | resolved | postmortem */
  status: string;
  body: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  name: string;
  status: string;
  /** none | minor | major | critical */
  impact: string;
  shortlink?: string;
  createdAt: string;
  updatedAt: string;
  updates: IncidentUpdate[];
  affectedComponents: string[];
}

export interface ServiceStatus {
  indicator: Indicator;
  description: string;
  components: Component[];
  activeIncidents: Incident[];
  /** Epoch ms when this snapshot was fetched. */
  fetchedAt: number;
}

export interface StatusProvider {
  getStatus(service: Service): Promise<ServiceStatus>;
  getIncidents(service: Service): Promise<Incident[]>;
}
