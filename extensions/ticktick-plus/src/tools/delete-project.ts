import { Action, Tool } from "@raycast/api";
import { deleteProject } from "../api/ticktick";
import { findProjectByName, loadSyncData } from "./lib/data";

type Input = {
  /** Project ID from list-projects */
  projectId?: string;
  /** Project name if ID unknown */
  projectName?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  style: Action.Style.Destructive,
  message: `Delete project "${input.projectName ?? input.projectId}"? Tasks in the project may be lost.`,
  info: [{ name: "Project", value: input.projectName ?? input.projectId ?? "?" }],
});

/**
 * Delete a TickTick project. Always asks for confirmation.
 */
export default async function tool(input: Input) {
  const sync = await loadSyncData();
  let projectId = input.projectId;
  let projectName = input.projectName;
  if (!projectId && projectName) {
    const match = findProjectByName(sync.projects, projectName);
    if (!match) throw new Error(`Project "${projectName}" not found.`);
    projectId = match.id;
    projectName = match.name;
  }
  if (!projectId) throw new Error("Provide projectId or projectName.");
  if (projectId === sync.inboxId) {
    throw new Error("Cannot delete the Inbox.");
  }

  await deleteProject(projectId);
  return { deleted: { projectId, projectName: projectName ?? projectId } };
}
