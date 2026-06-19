export type RailwayDayStatus = "operational" | "degraded" | "major" | "none";

export interface RailwayDay {
  date: string;
  status: RailwayDayStatus;
  incidents: Array<{ title: string; slug: string; durationMinutes: number }>;
}

export interface RailwayComponent {
  id: string;
  name: string;
  uptimePercentage?: string;
  months?: Array<{ days: RailwayDay[] }>;
}

export interface RailwayStatusResponse {
  entries: Array<{ type: "component" | "group"; data: RailwayComponent }>;
  activeIncidents: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    updates?: Array<{ message: string }>;
    components?: Array<{ id: string; name: string }>;
  }>;
  generatedAt: string;
}
