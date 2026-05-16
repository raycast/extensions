import { Tool } from "@raycast/api";

import { getDashboard, updateDashboard } from "../api/dashboards";
import { getActiveProjectId, projectUrl } from "./_shared";

type Input = {
  /** The numeric PostHog dashboard ID. Get this from `dashboards-get-all`. */
  dashboardId: number;
  /** New name. */
  name?: string;
  /** New description. */
  description?: string;
  /** Pin or unpin. */
  pinned?: boolean;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const { dashboardId, ...patch } = input;
  const dashboard = await updateDashboard(projectId, dashboardId, patch);
  return { ...dashboard, url: projectUrl(`dashboard/${dashboard.id}`) };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const projectId = await getActiveProjectId();
  const current = await getDashboard(projectId, input.dashboardId);
  const info: { name: string; value: string }[] = [{ name: "Dashboard", value: `${current.name} (#${current.id})` }];
  if (input.name) info.push({ name: "New name", value: input.name });
  if (input.description !== undefined) info.push({ name: "New description", value: input.description });
  if (input.pinned !== undefined) info.push({ name: "Pinned", value: String(input.pinned) });
  return { message: "Update this dashboard?", info };
};
