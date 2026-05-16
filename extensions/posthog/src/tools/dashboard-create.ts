import { Tool } from "@raycast/api";

import { createDashboard } from "../api/dashboards";
import { getActiveProjectId, projectUrl } from "./_shared";

type Input = {
  /** Name of the new dashboard. */
  name: string;
  /** Optional description. */
  description?: string;
  /** Whether to pin the dashboard. Defaults to false. */
  pinned?: boolean;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const dashboard = await createDashboard(projectId, {
    name: input.name,
    description: input.description ?? "",
    pinned: input.pinned ?? false,
  });
  return { ...dashboard, url: projectUrl(`dashboard/${dashboard.id}`) };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Create a new dashboard named "${input.name}"?`,
  info: [
    { name: "Name", value: input.name },
    ...(input.description ? [{ name: "Description", value: input.description }] : []),
  ],
});
