import { fetchJson } from "../fetch";
import { severityRank } from "../status-format";
import type { Incident, Indicator, Service, ServiceStatus, StatusProvider } from "./types";

// Slack publishes its own JSON (not Statuspage): status.slack.com/api/v2.0.0/{current,history}.
interface SlackNote {
  body: string;
  date_created: string;
}

interface SlackIncident {
  id: string | number;
  title: string;
  type: string; // incident | outage | notice
  status: string; // active | resolved
  url?: string;
  date_created: string;
  date_updated: string;
  notes?: SlackNote[];
  services?: string[];
}

interface SlackCurrent {
  status: string; // "ok" when healthy
  active_incidents?: SlackIncident[];
}

function typeToIndicator(type: string): Indicator {
  switch (type) {
    case "outage":
      return "major";
    case "incident":
      return "minor";
    case "notice":
      return "maintenance";
    default:
      return "minor";
  }
}

function worstOf(incidents: SlackIncident[]): Indicator {
  return incidents.reduce<Indicator>((worst, incident) => {
    const candidate = typeToIndicator(incident.type);
    return severityRank(candidate) > severityRank(worst) ? candidate : worst;
  }, "none");
}

function mapIncident(raw: SlackIncident): Incident {
  return {
    id: String(raw.id),
    name: raw.title,
    status: raw.status,
    impact: raw.type,
    shortlink: raw.url,
    createdAt: raw.date_created,
    updatedAt: raw.date_updated,
    updates: (raw.notes ?? []).map((note) => ({ status: "update", body: note.body, createdAt: note.date_created })),
    affectedComponents: raw.services ?? [],
  };
}

export const slackProvider: StatusProvider = {
  async getStatus(service: Service): Promise<ServiceStatus> {
    const data = await fetchJson<SlackCurrent>(`${service.statusUrl}/api/v2.0.0/current`);
    const active = data.active_incidents ?? [];
    return {
      indicator: worstOf(active),
      description: active.length === 0 ? "All Systems Operational" : `${active.length} active incident(s)`,
      components: [],
      activeIncidents: active.map(mapIncident),
      fetchedAt: Date.now(),
    };
  },

  async getIncidents(service: Service): Promise<Incident[]> {
    const data = await fetchJson<SlackIncident[] | { history?: SlackIncident[] }>(
      `${service.statusUrl}/api/v2.0.0/history`,
    );
    const list = Array.isArray(data) ? data : (data.history ?? []);
    return list.map(mapIncident);
  },
};
