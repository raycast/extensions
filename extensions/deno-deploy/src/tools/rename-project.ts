import { Action, type Tool } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { createWindowLessFetcher as createDashFetcher } from "@/api/dash";
import { createWindowLessFetcher as createDenoFetcher } from "@/api/deno";
import type { Project } from "@/api/types";

type Input = {
  /**
   * The ID of the project.
   *
   * @remarks
   * Use the `get-projects` tool to get a list of projects.
   */
  projectId: string;
  /**
   * The new name of the project.
   *
   * @remarks
   * The new name must be unique and should only contain alphanumeric characters, dashes.
   */
  newName: string;
};

const tool = async (input: Input) => {
  const dashFetcher = createDashFetcher();
  const project = await dashFetcher.requestJSON<Project | null>(`/projects/${input.projectId}`);
  if (!project) {
    const err = new Error(`Project not found: ${input.projectId}`);
    showFailureToast("Project not found", err);
    throw err;
  }

  const newName = input.newName.trim();
  if (!newName.match(/^[a-zA-Z0-9-]+$/)) {
    const err = new Error("The new name should only contain alphanumeric characters and dashes.");
    showFailureToast("Naming error", err);
    throw err;
  }

  const denoFetcher = createDenoFetcher();
  await denoFetcher.request(`/projects/${input.projectId}`, {
    method: "PATCH",
    body: JSON.stringify({ name: input.newName }),
  });
  return `Project with ID \`${input.projectId}\` has been renamed to \`${input.newName}\`.`;
};

export default tool;

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Are you sure you want to rename the project with ID \`${input.projectId}\` to \`${input.newName}\`?`,
    style: Action.Style.Destructive,
  };
};
