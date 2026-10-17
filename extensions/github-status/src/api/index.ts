export const STATUS_URL = "https://www.githubstatus.com/api/v2/summary.json";

type BaseState = {
  id: string;
  created_at: string;
  updated_at: string;
};

export type StatusIndicator = Readonly<{
  indicator: string;
  description: string;
}>;

export type StatusComponent = Readonly<
  BaseState & {
    name: string;
    status: string;
    position: number;
    description: string | null;
    only_show_if_degraded: boolean;
  }
>;

export type StatusIncidentUpdate = Readonly<
  BaseState & {
    status: string;
    body: string;
  }
>;

export type StatusIncident = Readonly<
  BaseState & {
    name: string;
    status: string;
    shortlink: string;
    incident_updates: StatusIncidentUpdate[];
  }
>;

export type StatusScheduledMaintenance = Readonly<{
  id: string;
  name: string;
  components: StatusComponent[];
  shortlink: string;
  scheduled_for: string;
  scheduled_until: string;
}>;

export type Status = Readonly<{
  components: StatusComponent[];
  incidents: StatusIncident[];
  status: StatusIndicator;
  scheduled_maintenances: StatusScheduledMaintenance[];
}>;

export type GitHubStatus = Readonly<{
  /** Overall GitHub service status */
  indicator: string;
  /** Human-readable description of the overall status */
  description: string;
  /** Status of individual GitHub service components */
  components: Pick<StatusComponent, "name" | "status">[];
  /** Currently active incidents */
  incidents: StatusIncident[];
  /** Upcoming scheduled maintenances */
  scheduled_maintenances: StatusScheduledMaintenance[];
}>;
