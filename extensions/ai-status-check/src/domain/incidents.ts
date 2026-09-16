import type { Incident, IncidentUpdate } from "./types";
import { parseTimestamp } from "../utils/dates";

export function incidentActivityTime(incident: Incident): number {
  return Math.max(
    0,
    ...[
      incident.startedAt,
      incident.updatedAt,
      incident.resolvedAt,
      ...incident.updates.map((update) => update.createdAt),
    ].map(parseTimestamp),
  );
}

export function sortIncidentsByActivity(incidents: readonly Incident[]): Incident[] {
  return [...incidents].sort((left, right) => incidentActivityTime(right) - incidentActivityTime(left));
}

export function mergeIncidents(
  history: readonly Incident[],
  preferred: readonly Incident[] = [],
  options: { authoritativeCurrentState?: boolean } = {},
): Incident[] {
  const merged = new Map(history.map((incident) => [incident.id, incident]));
  for (const incident of preferred) {
    const previous = merged.get(incident.id);
    if (!previous) {
      merged.set(incident.id, incident);
      continue;
    }
    const previousTime = incidentActivityTime(previous);
    const currentTime = incidentActivityTime(incident);
    // A source explicitly designated as current (Rootly JSON) owns lifecycle;
    // otherwise a dated historical record can be newer than a cached summary.
    const usePrevious =
      !options.authoritativeCurrentState && previousTime > 0 && currentTime > 0 && previousTime > currentTime;
    const primary = usePrevious ? previous : incident;
    const secondary = usePrevious ? incident : previous;
    merged.set(incident.id, {
      ...primary,
      stateText: primary.stateText ?? (primary.state === secondary.state ? secondary.stateText : undefined),
      impactText: primary.impactText ?? (primary.health === secondary.health ? secondary.impactText : undefined),
      startedAt: primary.startedAt ?? secondary.startedAt,
      updatedAt: primary.updatedAt ?? secondary.updatedAt,
      // Do not carry a previous resolution into a reopened incident.
      resolvedAt: primary.state === "resolved" ? (primary.resolvedAt ?? secondary.resolvedAt) : undefined,
      url: primary.url ?? secondary.url,
      affectedComponentIds: [...new Set([...secondary.affectedComponentIds, ...primary.affectedComponentIds])],
      updates: mergeUpdates(secondary.updates, primary.updates),
    });
  }
  return sortIncidentsByActivity([...merged.values()]);
}

function mergeUpdates(history: readonly IncidentUpdate[], current: readonly IncidentUpdate[]): IncidentUpdate[] {
  const byId = new Map([...history, ...current].map((update) => [update.id, update]));
  // HTML and JSON can identify the same published update differently.
  const byContent = new Map(
    [...byId.values()].map((update) => [
      JSON.stringify([parseTimestamp(update.createdAt), update.state, update.body]),
      update,
    ]),
  );
  return [...byContent.values()].sort(
    (left, right) => parseTimestamp(right.createdAt) - parseTimestamp(left.createdAt),
  );
}
