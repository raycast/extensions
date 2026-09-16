import type {
  ComponentStatus,
  DataAvailability,
  Health,
  Incident,
  IncidentState,
  IncidentUpdate,
  ProviderSnapshot,
} from "./types";
import { normalizeStatusToken } from "../utils/status-token";

export interface StatusPresentation {
  label: string;
  health: Health;
}

export function componentHistoryMessage(availability: DataAvailability | undefined, loading = false): string {
  if (loading) return "Loading component history…";
  if (availability === "unavailable")
    return "Component history could not be loaded. Current status is still available.";
  if (availability === "unsupported") return "No component history is published for this service.";
  return "No component history is available for this service.";
}

export function incidentHistoryMessage(availability: DataAvailability | undefined): {
  title: string;
  description: string;
} {
  if (availability === "available")
    return { title: "No Recent Incidents", description: "No resolved incidents were published in the last 30 days" };
  if (availability === "unsupported")
    return {
      title: "No Incident History Published",
      description: "Open the official status page for available information",
    };
  return {
    title: "Incident History Unavailable",
    description: "Recent incident history could not be verified. Current status is still available.",
  };
}

const KNOWN_HEALTH: Readonly<Partial<Record<string, Health>>> = {
  operational: "operational",
  up: "operational",
  available: "operational",
  good: "operational",
  all_system_operational: "operational",
  all_systems_operational: "operational",
  fully_operational: "operational",
  no_incidents_declared: "operational",
  degraded: "degraded",
  degraded_performance: "degraded",
  partial_outage: "partial_outage",
  major_outage: "major_outage",
  maintenance: "maintenance",
  under_maintenance: "maintenance",
  maintenance_scheduled: "maintenance",
};

const KNOWN_INCIDENT_STATES: Readonly<Partial<Record<string, string>>> = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
  completed: "Resolved",
  closed: "Resolved",
  scheduled: "Scheduled",
  maintenance_scheduled: "Scheduled",
};

const KNOWN_IMPACTS: Readonly<Partial<Record<string, string>>> = {
  none: "None",
  minor: "Minor",
  major: "Major",
  critical: "Critical",
};

export function fallbackHealthLabel(health: Health): string {
  switch (health) {
    case "operational":
      return "Operational";
    case "degraded":
      return "Degraded Performance";
    case "partial_outage":
      return "Partial Outage";
    case "major_outage":
      return "Major Outage";
    case "maintenance":
      return "Maintenance";
    case "unknown":
      return "Unknown";
  }
}

function fallbackIncidentStateLabel(state: IncidentState): string {
  switch (state) {
    case "investigating":
      return "Investigating";
    case "identified":
      return "Identified";
    case "monitoring":
      return "Monitoring";
    case "resolved":
      return "Resolved";
    case "scheduled":
      return "Scheduled";
    case "unknown":
      return "Unknown";
  }
}

export function incidentImpactLabel(incident: Incident): string | undefined {
  return knownSourceLabel(incident.impactText, KNOWN_IMPACTS);
}

export function providerStatusPresentation(snapshot: ProviderSnapshot): StatusPresentation {
  return healthPresentation(snapshot.statusText, snapshot.health, true);
}

export function componentStatusPresentation(component: ComponentStatus): StatusPresentation {
  return healthPresentation(component.statusText, component.health, false);
}

export function incidentStateLabel(incident: Pick<Incident, "state" | "stateText">): string {
  return knownSourceLabel(incident.stateText, KNOWN_INCIDENT_STATES) ?? fallbackIncidentStateLabel(incident.state);
}

export function incidentUpdateStateLabel(update: Pick<IncidentUpdate, "state" | "stateText">): string {
  return knownSourceLabel(update.stateText, KNOWN_INCIDENT_STATES) ?? fallbackIncidentStateLabel(update.state);
}

function healthPresentation(
  sourceText: string | undefined,
  fallbackHealth: Health,
  overall: boolean,
): StatusPresentation {
  const source = sourceValue(sourceText);
  const knownHealth = source ? KNOWN_HEALTH[normalizeStatusToken(source)] : undefined;
  const health = knownHealth ?? fallbackHealth;
  return {
    label: knownHealth ? healthLabel(knownHealth, overall) : (source ?? healthLabel(fallbackHealth, overall)),
    health,
  };
}

function healthLabel(health: Health, overall: boolean): string {
  if (overall && health === "operational") return "All Systems Operational";
  return fallbackHealthLabel(health);
}

function knownSourceLabel(
  value: string | undefined,
  labels: Readonly<Partial<Record<string, string>>>,
): string | undefined {
  const source = sourceValue(value);
  if (!source) return undefined;
  return labels[normalizeStatusToken(source)] ?? source;
}

function sourceValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}
