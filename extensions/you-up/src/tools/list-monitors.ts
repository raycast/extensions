import { getProjectUptime, listMonitors, listProjects } from "../api";
import { formatUptimePercent, monitorDashboardUrl } from "../format";

type Input = {
  /** Optional Project ID (`prj_...`). Leave empty to list across all reachable Projects. */
  projectId?: string;
  /** Optional search text matching a Monitor's name or target URL/host. */
  query?: string;
  /** Optional Monitor type filter: `http`, `tcp`, `ping`, or `heartbeat`. */
  type?: string;
  /** Optional Monitor state filter: `active`, `paused`, or `suspended`. */
  state?: string;
};

/**
 * List You Up? Monitors with their status, Checks, Check IDs, and 30-day uptime percentage.
 */
export default async function tool(input: Input) {
  const projects = await listProjects();
  const selected = input.projectId ? projects.filter((p) => p.id === input.projectId) : projects;

  const results = await Promise.all(
    selected.map(async (project) => {
      const [monitors, uptimes] = await Promise.all([
        listMonitors(project.id, { q: input.query, type: input.type, state: input.state }),
        getProjectUptime(project.id),
      ]);
      const uptimeById = new Map(uptimes.map((u) => [u.monitorId, u.window.percentage]));
      return {
        projectId: project.id,
        projectName: project.name,
        monitors: monitors.map((monitor) => ({
          monitorId: monitor.id,
          name: monitor.name,
          type: monitor.type,
          target: monitor.target,
          state: monitor.state,
          status: monitor.status,
          uptime30d: formatUptimePercent(uptimeById.get(monitor.id)),
          dashboardUrl: monitorDashboardUrl(project.id, monitor.id),
          checks: monitor.checks
            .filter((c) => c.enabled)
            .map((c) => ({
              checkId: c.id,
              type: c.type,
              status: c.status,
              snoozedUntil: c.snoozedUntil,
              heartbeatDeadline: c.heartbeatDeadline,
              openIncidentId: c.openIncident?.id ?? null,
            })),
        })),
      };
    }),
  );

  return results;
}
