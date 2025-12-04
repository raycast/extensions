import { Action, type Tool } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { createWindowLessFetcher } from "@/api/dash";
import type { Project } from "@/api/types";

type Input = {
  /**
   * The ID of the project.
   *
   * @remarks
   * Use the `get-projects` tool to get a list of projects.
   */
  projectId: string;
};

const tool = async (input: Input) => {
  const fetcher = createWindowLessFetcher();
  const project = await fetcher.requestJSON<Project | null>(`/projects/${input.projectId}`);
  if (!project) {
    const err = new Error(`Project not found: ${input.projectId}`);
    showFailureToast("Project not found", err);
    throw err;
  }
  await fetcher.request(`/projects/${input.projectId}`, { method: "DELETE" });
  return `Project with name \`${project.name}\` has been deleted.`;
};

export default tool;

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Are you sure you want to delete the project with ID \`${input.projectId}\`?`,
    style: Action.Style.Destructive,
  };
};
