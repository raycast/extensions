import { fetchJson } from "../fetch";
import type { Incident, Indicator, Service, ServiceStatus, StatusProvider } from "./types";

interface RawIncident {
  id: string;
  name: string;
  status: string;
  impact: string;
  shortlink?: string;
  created_at: string;
  updated_at: string;
  incident_updates?: { status: string; body: string; created_at: string }[];
  components?: { name: string }[];
}

interface SummaryResponse {
  status?: { indicator?: string; description?: string };
  components?: { id: string; name: string; status: string; group?: boolean }[];
  incidents?: RawIncident[];
}

interface IncidentsResponse {
  incidents?: RawIncident[];
}

function toIndicator(raw: string | undefined): Indicator {
  switch (raw) {
    case "none":
    case "minor":
    case "major":
    case "critical":
    case "maintenance":
      return raw;
    default:
      return "unknown";
  }
}

/** Active = not yet resolved. `postmortem` is a closed incident kept for the record, so exclude it. */
function isActive(incident: RawIncident): boolean {
  return incident.status !== "resolved" && incident.status !== "postmortem";
}

function mapIncident(raw: RawIncident): Incident {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    impact: raw.impact,
    shortlink: raw.shortlink,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    updates: (raw.incident_updates ?? []).map((update) => ({
      status: update.status,
      body: update.body,
      createdAt: update.created_at,
    })),
    affectedComponents: (raw.components ?? []).map((component) => component.name).filter(Boolean),
  };
}

/**
 * Statuspage exposes everything the dashboard needs from a single `summary.json`:
 * overall status, component list, and unresolved incidents. Full incident history
 * (`incidents.json`) is only fetched on demand for the detail view.
 */
export const statuspageProvider: StatusProvider = {
  async getStatus(service: Service): Promise<ServiceStatus> {
    const data = await fetchJson<SummaryResponse>(`${service.statusUrl}/api/v2/summary.json`);
    const components = (data.components ?? [])
      .filter((component) => !component.group)
      .map((component) => ({ id: component.id, name: component.name, status: component.status }));
    return {
      indicator: toIndicator(data.status?.indicator),
      description: data.status?.description ?? "Unknown",
      components,
      activeIncidents: (data.incidents ?? []).filter(isActive).map(mapIncident),
      fetchedAt: Date.now(),
    };
  },

  async getIncidents(service: Service): Promise<Incident[]> {
    const data = await fetchJson<IncidentsResponse>(`${service.statusUrl}/api/v2/incidents.json`);
    return (data.incidents ?? []).map(mapIncident);
  },
};
