import type { LaunchProps } from "@raycast/api";
import { showHUD } from "@raycast/api";
import { launchWorkspace } from "../../core/launcher/launcher";
import { getAllWorkspaces } from "../../core/storage/storage";
import type { Workspace } from "../../types/workspace";

interface Arguments {
  workspaceName: string;
}

/**
 * Finds a workspace by name (exact match first, then partial match)
 */
function findWorkspaceByName(
  workspaces: Workspace[],
  name: string,
): Workspace | undefined {
  const lowerName = name.toLowerCase();

  // Try exact match first
  const exactMatch = workspaces.find((w) => w.name.toLowerCase() === lowerName);
  if (exactMatch) return exactMatch;

  // Fall back to partial match
  return workspaces.find((w) => w.name.toLowerCase().includes(lowerName));
}

/**
 * Quick Open command - opens a workspace by name argument
 */
export default async function QuickOpen(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { workspaceName } = props.arguments;

  if (!workspaceName) {
    await showHUD("❌ Please provide a workspace name");
    return;
  }

  const workspaces = getAllWorkspaces();
  const workspace = findWorkspaceByName(workspaces, workspaceName);

  if (!workspace) {
    await showHUD(`❌ Workspace "${workspaceName}" not found`);
    return;
  }

  await showHUD(`🚀 Opening ${workspace.name}...`);
  await launchWorkspace(workspace.items, workspace.name);
}
