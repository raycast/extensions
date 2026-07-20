import { StatusIndicator } from "@/types";

export interface StatuspageSummary {
  page: { name: string; url: string };
  status: { indicator: StatusIndicator; description: string };
  components: Array<{
    id: string;
    name: string;
    status: string;
    group?: boolean;
  }>;
  incidents?: Array<{
    id: string;
    name: string;
    status: string;
    impact: string;
    updated_at: string;
    incident_updates?: Array<{
      body: string;
      affected_components?: Array<{ code: string }>;
    }>;
    components?: Array<{ id: string }>;
  }>;
}

export interface StatuspageIncident {
  id: string;
  name: string;
  status: string;
  impact: string;
  updated_at: string;
  created_at: string;
  resolved_at: string | null;
  incident_updates?: Array<{
    body: string;
    affected_components?: Array<{ code: string }>;
  }>;
  components?: Array<{ id: string }>;
}
