import type { Health, IncidentState } from "../../domain/types";
import { normalizeStatusToken } from "../../utils/status-token";

const HEALTH_BY_STATUS: Readonly<Partial<Record<string, Health>>> = {
  up: "operational",
  available: "operational",
  good: "operational",
  none: "operational",
  operational: "operational",
  resolved: "operational",
  all_system_operational: "operational",
  all_systems_operational: "operational",
  fully_operational: "operational",
  no_incidents: "operational",
  no_incidents_declared: "operational",
  maintenance: "maintenance",
  under_maintenance: "maintenance",
  maintenance_scheduled: "maintenance",
  scheduled: "maintenance",
  degraded: "degraded",
  degraded_performance: "degraded",
  disruption: "degraded",
  minor: "degraded",
  warning: "degraded",
  partial: "partial_outage",
  partial_outage: "partial_outage",
  medium: "partial_outage",
  down: "major_outage",
  downtime: "major_outage",
  major: "major_outage",
  major_outage: "major_outage",
  full_outage: "major_outage",
  critical: "major_outage",
  outage: "major_outage",
  disrupted: "major_outage",
  high: "major_outage",
};

const INCIDENT_STATE_BY_STATUS: Readonly<Partial<Record<string, IncidentState>>> = {
  resolved: "resolved",
  completed: "resolved",
  available: "resolved",
  closed: "resolved",
  identified: "identified",
  monitoring: "monitoring",
  mitigated: "monitoring",
  update: "monitoring",
  scheduled: "scheduled",
  maintenance: "scheduled",
  maintenance_scheduled: "scheduled",
  in_progress: "scheduled",
  investigating: "investigating",
  detected: "investigating",
  open: "investigating",
};

export function mapFlexibleHealth(value: string | undefined): Health {
  return HEALTH_BY_STATUS[normalizeStatusToken(value ?? "")] ?? "unknown";
}

export function mapFlexibleIncidentState(value: string | undefined): IncidentState {
  return INCIDENT_STATE_BY_STATUS[normalizeStatusToken(value ?? "")] ?? "unknown";
}

export function statusComponentId(name: string): string {
  return normalizeStatusToken(name).replaceAll("_", "-");
}
