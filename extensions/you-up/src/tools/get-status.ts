import { getStatus } from "../api";
import { checkTypeLabel, formatErrorKind, incidentDashboardUrl, monitorDashboardUrl } from "../format";

type Input = {
  /** Optional Project ID (`prj_...`) to check. Leave empty to check all Projects reachable by the token. */
  projectId?: string;
};

/**
 * Check what is currently not `ok` across your You Up? Projects: open Incidents, non-ok Monitors, and Regional outages.
 */
export default async function tool(input: Input) {
  const status = await getStatus(input.projectId);
  return {
    allUp: status.projects.every(
      (p) => p.incidents.length === 0 && p.monitors.length === 0 && p.regionalOutages.length === 0,
    ),
    projects: status.projects.map((project) => ({
      projectId: project.projectId,
      name: project.name,
      openIncidents: project.incidents.map((incident) => {
        const monitor = project.monitors.find((m) => m.id === incident.monitorId);
        return {
          incidentId: incident.id,
          monitorId: incident.monitorId,
          monitorName: monitor?.name ?? incident.monitorId,
          target: monitor?.target ?? null,
          checkId: incident.checkId,
          checkType: checkTypeLabel(incident.checkType),
          reason: formatErrorKind(incident.errorKind),
          openedAt: incident.openedAt,
          acknowledgedAt: incident.acknowledgedAt,
          dashboardUrl: incidentDashboardUrl(project.projectId, incident.monitorId, incident.id),
        };
      }),
      nonOkMonitors: project.monitors.map((monitor) => ({
        monitorId: monitor.id,
        name: monitor.name,
        target: monitor.target,
        type: monitor.type,
        state: monitor.state,
        status: monitor.status,
        dashboardUrl: monitorDashboardUrl(project.projectId, monitor.id),
      })),
      regionalOutages: project.regionalOutages,
    })),
  };
}
