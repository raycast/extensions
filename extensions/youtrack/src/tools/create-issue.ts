import type { Tool } from "@raycast/api";
import { YouTrackApi } from "../api/youtrack-api";
import { loadCache } from "../cache";
import type { Project } from "../interfaces";
import { handleOnCatchError } from "../api/errors-helper";

type Input = {
  /**
   * The title of the task
   */
  summary: string;
  /**
   * The description of the task
   */
  description?: string;
  /**
   * The project short name, e.g. `DEMO`
   */
  project: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    info: Object.entries(input).map(([key, value]) => ({ name: key, value })),
    message: `Are you sure you want to create an issue with the title "${input.summary}"?`,
  };
};

/**
 * Create a new issue in YouTrack with the given input. Check if project exists first.
 */
export default async function createIssueTool(input: Input) {
  const api = YouTrackApi.getInstance();
  const projects = await loadCache<Project>("youtrack-projects");
  const project = projects.find(({ shortName }) => shortName === input.project);
  if (!project) {
    throw new Error(`Project with name ${input.project} not found.`);
  }
  try {
    return await api.createIssue({ ...input, project: { id: project.id } });
  } catch (error) {
    handleOnCatchError(error, "Error creating issue");
  }
}
