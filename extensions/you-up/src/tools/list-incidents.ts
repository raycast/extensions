import { getIncidentEvidence, listIncidents, listMonitors, listProjects } from "../api";
import { checkTypeLabel, formatErrorKind, incidentDashboardUrl } from "../format";

type Input = {
  /** Optional Project ID (`prj_...`). Leave empty to search across all reachable Projects. */
  projectId?: string;
  /** Set to `true` for open Incidents only (default), or `false` for resolved Incidents. */
  openOnly?: boolean;
  /** Optional Incident ID (`inc_...`) to include multi-location outage evidence (`stoppingPoint`). */
  incidentId?: string;
};

/**
 * List open or resolved Incidents in You Up?, and optionally fetch outage evidence (`stoppingPoint`) for an Incident.
 */
export default async function tool(input: Input) {
  const projects = await listProjects();
  const selected = input.projectId ? projects.filter((p) => p.id === input.projectId) : projects;
  const openFlag = input.openOnly === false ? "false" : "true";

  const results = await Promise.all(
    selected.map(async (project) => {
      const [incidents, monitors] = await Promise.all([
        listIncidents(project.id, { open: openFlag, limit: 25 }),
        listMonitors(project.id),
      ]);
      const monitorById = new Map(monitors.map((m) => [m.id, m]));

      const enriched = await Promise.all(
        incidents.map(async (incident) => {
          const monitor = monitorById.get(incident.monitorId);
          const shouldFetchEvidence =
            input.incidentId === incident.id || (input.openOnly !== false && incidents.length <= 5);
          const evidence = shouldFetchEvidence
            ? await getIncidentEvidence(project.id, incident.id).catch(() => null)
            : null;
          return {
            incidentId: incident.id,
            projectId: project.id,
            projectName: project.name,
            monitorId: incident.monitorId,
            monitorName: monitor?.name ?? incident.monitorId,
            target: monitor?.target ?? null,
            checkId: incident.checkId,
            checkType: checkTypeLabel(incident.checkType),
            reason: formatErrorKind(incident.errorKind),
            openedAt: incident.openedAt,
            acknowledgedAt: incident.acknowledgedAt,
            resolvedAt: incident.resolvedAt,
            stoppingPoint: evidence?.stoppingPoint ?? null,
            dashboardUrl: incidentDashboardUrl(project.id, incident.monitorId, incident.id),
          };
        }),
      );

      return {
        projectId: project.id,
        projectName: project.name,
        incidents: input.incidentId ? enriched.filter((i) => i.incidentId === input.incidentId) : enriched,
      };
    }),
  );

  return results;
}
