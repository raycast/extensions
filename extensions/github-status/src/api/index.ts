export const STATUS_URL = "https://www.githubstatus.com/api/v2/summary.json";

export interface Status {
  components: StatusComponent[];
  incidents: StatusIncident[];
  status: { indicator: string; description: string };
  scheduled_maintenances: StatusScheduledMaintenance[];
}

export interface StatusIncident {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  shortlink: string;
  incident_updates: StatusIncidentUpdate[];
}

interface StatusIncidentUpdate {
  id: string;
  status: string;
  body: string;
  created_at: string;
  updated_at: string;
}

interface StatusScheduledMaintenance {
  id: string;
  name: string;
  components: StatusComponent[];
  shortlink: string;
  scheduled_for: string;
  scheduled_until: string;
}

interface StatusComponent {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  position: number;
  description: string;
  only_show_if_degraded: boolean;
}
