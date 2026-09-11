import { incidentActivityTime, sortIncidentsByActivity } from "./incidents";
import type { ComponentStatus, Incident } from "./types";

const RECENT_INCIDENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1_000;
const RECENT_INCIDENT_LIMIT = 10;

interface ComponentGroup {
  name: string;
  components: ComponentStatus[];
}

interface ComponentSections {
  ungrouped: ComponentStatus[];
  groups: ComponentGroup[];
}

export function buildComponentSections(components: readonly ComponentStatus[]): ComponentSections {
  const ungrouped: ComponentStatus[] = [];
  const groups = new Map<string, ComponentStatus[]>();

  for (const component of components) {
    if (!component.group) {
      ungrouped.push(component);
      continue;
    }

    const group = groups.get(component.group) ?? [];
    group.push(component);
    groups.set(component.group, group);
  }

  return {
    ungrouped,
    groups: [...groups].map(([name, groupedComponents]) => ({
      name,
      components: groupedComponents,
    })),
  };
}

export function getActiveIncidents(incidents: readonly Incident[]): Incident[] {
  return sortIncidentsByActivity(incidents.filter((incident) => incident.state !== "resolved"));
}

export function getRecentIncidents(incidents: readonly Incident[], now = Date.now()): Incident[] {
  const cutoff = now - RECENT_INCIDENT_WINDOW_MS;
  return sortIncidentsByActivity(incidents)
    .filter((incident) => incident.state === "resolved")
    .filter((incident) => {
      const activityAt = incidentActivityTime(incident);
      return activityAt === 0 || activityAt >= cutoff;
    })
    .slice(0, RECENT_INCIDENT_LIMIT);
}
