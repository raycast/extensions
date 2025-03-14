import { Action, type Tool } from "@raycast/api";

import { createWindowLessFetcher } from "@/api/dash/fetcher";
import type { Project } from "@/api/types";

/**
 *   const deleteProject = useCallback(
     (id: string, abort?: AbortSignal) => fetcher.request(`/projects/${id}`, { method: "DELETE", signal: abort }),
     [fetcher],
   );
 */

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
    throw new Error(`Project not found: ${input.projectId}`);
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
