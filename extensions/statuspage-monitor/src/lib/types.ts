// Types (stolen with permission) from https://github.com/Benricheson101/statuspage.js

/** Component status indicators */
export type Indicator = "none" | "minor" | "major" | "critical" | "maintenance";

/** Incident statuses */
export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved" | "postmortem";

/** Component statuses */
export type ComponentStatus =
  | "operational"
  | "degraded_performance"
  | "partial_outage"
  | "major_outage"
  | "under_maintenance";

/**
 * Basic info about the statuspage.
 *
 * All responses include this.
 */
export interface Page {
  id: string;
  name: string;
  url: string;
  updated_at: Date;
}

export interface PageStatusInfo {
  description: string;
  indicator: Indicator;
}

export interface Component {
  id: string;
  name: string;
  status: ComponentStatus;
  created_at: Date;
  updated_at: Date;
  position: number;
  description: string | null;
  showcase: boolean;
  start_date: Date | null;
  group_id: string | null;
  page_id: string;
  group: boolean;
  only_show_if_degraded: boolean;
  components?: string[];
}

export type ComponentGroup = Omit<Component, "components"> & { components: Component[] };

export interface Incident {
  created_at: Date;
  id: string;
  impact: Indicator;
  monitoring_at: Date | null;
  name: string;
  page_id: string;
  resolved_at: Date | null;
  shortlink: string;
  status: IncidentStatus;
  updated_at: Date;
  incident_updates: IncidentUpdates[];
}

export interface IncidentUpdates {
  body: string;
  created_at: Date;
  display_at: Date;
  updated_at: Date;
  id: string;
  incident_id: string;
  status: IncidentStatus;
}

export interface ScheduledMaintenance extends Incident {
  scheduled_for: Date;
  scheduled_until: Date;
}

//
// -- api endpoint responses --
//

/** Base response type that all other responses are derived from */
export interface Response {
  page: Page;
}

export interface Summary extends Response {
  status: PageStatusInfo;
  components?: Component[];
  incidents?: Incident[];
  scheduled_maintenances?: ScheduledMaintenance[];
}

export interface PageStatus extends Response {
  status: PageStatusInfo;
}

export interface PageComponents extends Response {
  components: Component[];
}

export interface AllIncidents extends Response {
  incidents: Incident[];
}

export interface UnresolvedIncidents extends Response {
  incidents: Incident[];
}

export interface AllScheduledMaintenances extends Response {
  scheduled_maintenances: ScheduledMaintenance[];
}

export interface ActiveScheduledMaintenances extends Response {
  scheduled_maintenances: ScheduledMaintenance[];
}

export interface UpcomingScheduledMaintenances extends Response {
  scheduled_maintenances: ScheduledMaintenance[];
}
