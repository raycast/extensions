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
    const found = sync.projects.find((p) => p.id === input.projectId);
    return {
      sync,
      projectId: input.projectId,
      projectName: found?.name ?? input.projectId,
    };
  }
  if (input.projectName) {
    const match = findProjectByName(sync.projects, input.projectName);
    if (!match) throw new Error(`Project "${input.projectName}" not found.`);
    return { sync, projectId: match.id, projectName: match.name };
  }
  throw new Error("Provide projectId or projectName.");
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  let label = input.projectId ?? input.projectName ?? "?";
  try {
    const resolved = await resolveProject(input);
    label = resolved.projectName;
  } catch {
    // Fall back to ID (never a mismatched supplied name when an ID is present).
    label = input.projectId ?? input.projectName ?? "?";
  }
  return {
    style: Action.Style.Destructive,
    message: `Delete project "${label}"? Tasks in the project may be lost.`,
    info: [{ name: "Project", value: label }],
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
