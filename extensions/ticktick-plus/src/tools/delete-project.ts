import { Action, Tool } from "@raycast/api";
import { deleteProject } from "../api/ticktick";
import { findProjectByName, loadSyncData, SyncSnapshot } from "./lib/data";

type Input = {
  /** Project ID from list-projects */
  projectId?: string;
  /** Project name if ID unknown */
  projectName?: string;
};

type ResolvedProject = {
  sync: SyncSnapshot;
  projectId: string;
  projectName: string;
};

async function resolveProject(input: Input): Promise<ResolvedProject> {
  const sync = await loadSyncData();
  if (input.projectId) {
    // Resolve rather than trust: an ID that is not in the account cannot be described
    // honestly in the confirmation, so refuse it instead of deleting an unknown project.
    const found = sync.projects.find((p) => p.id === input.projectId);
    if (!found) {
      throw new Error(`Project "${input.projectId}" not found. Call list-projects and retry with a current projectId.`);
    }
    return { sync, projectId: found.id, projectName: found.name };
  }
  if (input.projectName) {
    const match = findProjectByName(sync.projects, input.projectName);
    if (!match) throw new Error(`Project "${input.projectName}" not found.`);
    return { sync, projectId: match.id, projectName: match.name };
  }
  throw new Error("Provide projectId or projectName.");
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { sync, projectId, projectName } = await resolveProject(input);
  if (projectId === sync.inboxId) {
    throw new Error("Cannot delete the Inbox.");
  }
  return {
    style: Action.Style.Destructive,
    message: `Delete project "${projectName}"? Tasks in the project may be lost.`,
    info: [
      { name: "Project", value: projectName },
      { name: "Project ID", value: projectId },
    ],
  };
};

/**
 * Delete a TickTick project. Always asks for confirmation.
 */
export default async function tool(input: Input) {
  const { sync, projectId, projectName } = await resolveProject(input);
  if (projectId === sync.inboxId) {
    throw new Error("Cannot delete the Inbox.");
  }

  await deleteProject(projectId);
  return { deleted: { projectId, projectName } };
}
