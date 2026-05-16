import { Tool } from "@raycast/api";

import { addInsightToDashboard, getDashboard } from "../api/dashboards";
import { getInsight } from "../api/insights";
import { getActiveProjectId } from "./_shared";

type Input = {
  /** The numeric dashboard ID to add the insight to. Get this from `dashboards-get-all`. */
  dashboardId: number;
  /** The numeric insight ID to add. Get this from `insights-get-all`. */
  insightId: number;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  return await addInsightToDashboard(projectId, input.dashboardId, input.insightId);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const projectId = await getActiveProjectId();
  const [dashboard, insight] = await Promise.all([
    getDashboard(projectId, input.dashboardId),
    getInsight(projectId, input.insightId),
  ]);
  return {
    message: "Add this insight to the dashboard?",
    info: [
      { name: "Dashboard", value: dashboard.name },
      { name: "Insight", value: insight.name || insight.derived_name || `#${insight.id}` },
    ],
  };
};
