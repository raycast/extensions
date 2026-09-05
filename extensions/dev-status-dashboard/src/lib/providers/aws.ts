import { fetchJsonUtf16 } from "../fetch";
import { severityRank } from "../status-format";
import type { Component, Incident, Indicator, ServiceStatus, StatusProvider } from "./types";

// AWS has no Statuspage; its public health feed lists currently-active events per service+region,
// served as UTF-16LE JSON. `status` is a numeric severity (1 informational → 3 disruption).
const EVENTS_URL = "https://health.aws.amazon.com/public/currentevents";

interface AwsLogEntry {
  summary?: string;
  message: string;
  status?: number | string;
  timestamp?: number | string;
}

interface AwsEvent {
  arn: string;
  date?: number | string;
  region_name?: string;
  status?: number | string;
  service?: string;
  service_name?: string;
  summary?: string;
  event_log?: AwsLogEntry[];
}

function toNumber(value: number | string | undefined): number {
  const parsed = typeof value === "string" ? Number(value) : (value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusToIndicator(status: number): Indicator {
  if (status >= 3) return "critical";
  if (status === 2) return "major";
  if (status >= 1) return "minor";
  return "none";
}

function componentStatus(status: number): string {
  if (status >= 3) return "major_outage";
  if (status === 2) return "partial_outage";
  return "degraded_performance";
}

/** AWS timestamps are epoch seconds; empty string when missing so `formatDateTime` can fall back. */
function epochToIso(value: number | string | undefined): string {
  const seconds = toNumber(value);
  return seconds > 0 ? new Date(seconds * 1000).toISOString() : "";
}

function label(event: AwsEvent): string {
  const region = event.region_name ? ` (${event.region_name})` : "";
  return `${event.service_name ?? event.service ?? "AWS"}${region}`;
}

function mapEvent(raw: AwsEvent): Incident {
  const log = raw.event_log ?? [];
  const latest = log[log.length - 1];
  return {
    id: raw.arn,
    name: `${label(raw)} — ${raw.summary ?? "Event"}`,
    status: statusToIndicator(toNumber(raw.status)) === "none" ? "Resolved" : "Active",
    impact: String(toNumber(raw.status)),
    shortlink: "https://health.aws.amazon.com/health/status",
    createdAt: epochToIso(raw.date),
    updatedAt: latest ? epochToIso(latest.timestamp) : epochToIso(raw.date),
    updates: log.map((entry) => ({
      status: entry.summary ?? "update",
      body: entry.message,
      createdAt: epochToIso(entry.timestamp),
    })),
    affectedComponents: [label(raw)],
  };
}

export const awsProvider: StatusProvider = {
  async getStatus(): Promise<ServiceStatus> {
    const events = await fetchJsonUtf16<AwsEvent[]>(EVENTS_URL);
    const list = Array.isArray(events) ? events : [];

    const indicator = list.reduce<Indicator>((worst, event) => {
      const candidate = statusToIndicator(toNumber(event.status));
      return severityRank(candidate) > severityRank(worst) ? candidate : worst;
    }, "none");

    const components: Component[] = list.map((event) => ({
      id: event.arn,
      name: label(event),
      status: componentStatus(toNumber(event.status)),
    }));

    return {
      indicator,
      description: list.length === 0 ? "Service is operating normally" : `${list.length} active event(s)`,
      components,
      activeIncidents: list.map(mapEvent),
      fetchedAt: Date.now(),
    };
  },

  async getIncidents(): Promise<Incident[]> {
    const events = await fetchJsonUtf16<AwsEvent[]>(EVENTS_URL);
    return (Array.isArray(events) ? events : []).map(mapEvent);
  },
};
