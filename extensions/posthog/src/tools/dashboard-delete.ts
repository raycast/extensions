import { Action, Tool } from "@raycast/api";

import { deleteDashboard, getDashboard } from "../api/dashboards";
import { getActiveProjectId } from "./_shared";

type Input = {
  /** The numeric PostHog dashboard ID. Get this from `dashboards-get-all`. */
  dashboardId: number;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  await deleteDashboard(projectId, input.dashboardId);
  return { deleted: input.dashboardId };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const projectId = await getActiveProjectId();
  const current = await getDashboard(projectId, input.dashboardId);
  return {
    style: Action.Style.Destructive,
    message: `Delete dashboard "${current.name}"?`,
    info: [
      { name: "Dashboard", value: current.name },
      { name: "ID", value: String(current.id) },
    ],
  };
};
