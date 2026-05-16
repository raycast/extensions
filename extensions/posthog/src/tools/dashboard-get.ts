import { getDashboard } from "../api/dashboards";
import { getActiveProjectId, projectUrl } from "./_shared";

type Input = {
  /** The numeric PostHog dashboard ID. Get this from `dashboards-get-all` first. */
  dashboardId: number;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const dashboard = await getDashboard(projectId, input.dashboardId);
  return {
    ...dashboard,
    url: projectUrl(`dashboard/${dashboard.id}`),
  };
}
