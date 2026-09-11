import type { StatusSnapshot } from "@/types";

export function compactSnapshotForList(
  snapshot: StatusSnapshot,
): StatusSnapshot {
  return {
    pageName: snapshot.pageName,
    pageUrl: snapshot.pageUrl,
    overallDescription: snapshot.overallDescription,
    indicator: snapshot.indicator,
    fetchedAt: snapshot.fetchedAt,
    error: snapshot.error,
    components: [],
    incidents: snapshot.incidents.map((incident) => ({
      id: incident.id,
      name: incident.name,
      status: incident.status,
      impact: incident.impact,
      updatedAt: incident.updatedAt,
    })),
  };
}
