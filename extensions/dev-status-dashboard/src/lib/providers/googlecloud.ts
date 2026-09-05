import { fetchJson } from "../fetch";
import { humanize, severityRank } from "../status-format";
import type { Incident, Indicator, Service, ServiceStatus, StatusProvider } from "./types";

// Google Cloud (also where Gemini / Vertex AI incidents show up) publishes a flat incidents.json.
// An incident is active until it gets an `end` timestamp; severity is low | medium | high.
interface GcpUpdate {
  created?: string;
  when?: string;
  text: string;
  status: string;
}

interface GcpProduct {
  title: string;
  id: string;
}

interface GcpIncident {
  id: string;
  begin?: string;
  created?: string;
  end?: string | null;
  modified?: string;
  external_desc: string;
  severity: string;
  updates?: GcpUpdate[];
  most_recent_update?: GcpUpdate;
  affected_products?: GcpProduct[];
  uri?: string;
}

function severityToIndicator(severity: string): Indicator {
  switch (severity) {
    case "high":
      return "critical";
    case "medium":
      return "major";
    case "low":
      return "minor";
    default:
      return "minor";
  }
}

function isActive(incident: GcpIncident): boolean {
  return !incident.end;
}

function worstOf(incidents: GcpIncident[]): Indicator {
  return incidents.reduce<Indicator>((worst, incident) => {
    const candidate = severityToIndicator(incident.severity);
    return severityRank(candidate) > severityRank(worst) ? candidate : worst;
  }, "none");
}

function mapIncident(service: Service, raw: GcpIncident): Incident {
  return {
    id: raw.id,
    name: raw.external_desc,
    status: raw.most_recent_update?.status
      ? humanize(raw.most_recent_update.status)
      : isActive(raw)
        ? "Active"
        : "Resolved",
    impact: raw.severity,
    shortlink: raw.uri ? `${service.statusUrl}/${raw.uri.replace(/^\//, "")}` : undefined,
    createdAt: raw.begin ?? raw.created ?? "",
    updatedAt: raw.modified ?? raw.begin ?? "",
    updates: (raw.updates ?? []).map((update) => ({
      status: update.status,
      body: update.text,
      createdAt: update.created ?? update.when ?? "",
    })),
    affectedComponents: (raw.affected_products ?? []).map((product) => product.title).filter(Boolean),
  };
}

export const gcpProvider: StatusProvider = {
  async getStatus(service: Service): Promise<ServiceStatus> {
    const all = await fetchJson<GcpIncident[]>(`${service.statusUrl}/incidents.json`);
    const active = (Array.isArray(all) ? all : []).filter(isActive);

    const products = new Map<string, string>();
    for (const incident of active) {
      for (const product of incident.affected_products ?? []) products.set(product.id, product.title);
    }

    return {
      indicator: worstOf(active),
      description: active.length === 0 ? "All Systems Operational" : `${active.length} active incident(s)`,
      components: [...products].map(([id, name]) => ({ id, name, status: "major_outage" })),
      activeIncidents: active.map((incident) => mapIncident(service, incident)),
      fetchedAt: Date.now(),
    };
  },

  async getIncidents(service: Service): Promise<Incident[]> {
    const all = await fetchJson<GcpIncident[]>(`${service.statusUrl}/incidents.json`);
    return (Array.isArray(all) ? all : []).map((incident) => mapIncident(service, incident));
  },
};
