import { updateProject } from "../api/ticktick";
import { findProjectByName, loadSyncData } from "./lib/data";

type Input = {
  /** Project ID from list-projects */
  projectId?: string;
  /** Project name if ID unknown */
  projectName?: string;
  /** New name */
  name?: string;
  /** New hex color */
  color?: string;
};

/**
 * Rename a project or change its color. Call list-projects first when the ID is unknown.
 */
export default async function tool(input: Input) {
  const sync = await loadSyncData();
  let projectId = input.projectId;
  if (!projectId && input.projectName) {
    const match = findProjectByName(sync.projects, input.projectName);
    if (!match) throw new Error(`Project "${input.projectName}" not found.`);
    projectId = match.id;
  }
  if (!projectId) throw new Error("Provide projectId or projectName.");
  if (!input.name && !input.color) {
    throw new Error("Provide a new name and/or color.");
  }

  const project = await updateProject(projectId, {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.color !== undefined && { color: input.color }),
  });

  return {
    project: {
      id: project.id,
      name: project.name,
      color: project.color,
    },
  };
}
