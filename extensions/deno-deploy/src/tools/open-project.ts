import { open } from "@raycast/api";
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
    throw new Error(`Project not found: ${input.projectId}`);
  }
  try {
    open(`https://dash.deno.com/projects/${project.name}`);
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    showFailureToast("Failed to open the project", err);
    throw err;
  }
};

export default tool;
