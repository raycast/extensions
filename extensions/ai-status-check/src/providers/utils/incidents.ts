import type { Incident } from "../../domain/types";
import { parseTimestamp } from "../../utils/dates";

export function incidentActivityTime(incident: Incident): number {
  return parseTimestamp(incident.resolvedAt ?? incident.updatedAt ?? incident.startedAt);
}

export function sortIncidentsByActivity(incidents: readonly Incident[]): Incident[] {
  return [...incidents].sort((left, right) => incidentActivityTime(right) - incidentActivityTime(left));
}

export function mergeIncidents(history: readonly Incident[], preferred: readonly Incident[] = []): Incident[] {
  const merged = new Map(history.map((incident) => [incident.id, incident]));
  for (const incident of preferred) merged.set(incident.id, incident);
  return sortIncidentsByActivity([...merged.values()]);
}
