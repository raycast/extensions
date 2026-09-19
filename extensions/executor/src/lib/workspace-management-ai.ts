import { currentWorkspace, saveWorkspace, removeWorkspace, activateWorkspace, workspaceSummary } from "./workspaces";
import { verifyWorkspace } from "./workspace-setup";
import type { ConfirmationDetails } from "./ai-tools";

export interface WorkspaceChangeInput {
  operation: "rename" | "update" | "switch" | "verify" | "remove";
  name?: string;
  defaultOwner?: "all" | "user" | "org";
}

function changeTarget(input: WorkspaceChangeInput) {
  const workspace = currentWorkspace();
  if (!workspace) throw new Error("Choose an exact workspace first.");
  if (!["rename", "update", "switch", "verify", "remove"].includes(input.operation))
    throw new Error("Invalid workspace operation.");
  if (input.operation === "rename" && (typeof input.name !== "string" || !input.name.trim()))
    throw new Error("Provide a new workspace name.");
  if (input.name !== undefined && (typeof input.name !== "string" || !input.name.trim()))
    throw new Error("Provide a non-blank workspace name.");
  if (!["rename", "update"].includes(input.operation) && input.name !== undefined)
    throw new Error("Only rename or update accepts a name.");
  if (
    input.defaultOwner !== undefined &&
    (input.operation !== "update" || !["all", "user", "org"].includes(input.defaultOwner))
  )
    throw new Error("Only update accepts a valid connection filter.");
  if (input.operation === "update" && input.name === undefined && input.defaultOwner === undefined)
    throw new Error("Provide a name or connection filter.");
  if (input.defaultOwner !== undefined && workspace.isLegacy)
    throw new Error("Change this workspace's connection filter in Extension Preferences.");
  if (input.operation === "remove" && workspace.isLegacy)
    throw new Error("Clear the default workspace API key in extension preferences before removing this profile.");
  return workspace;
}

export function workspaceChangeConfirmation(input: WorkspaceChangeInput): ConfirmationDetails {
  const workspace = changeTarget(input);
  const messages = {
    update:
      "Update this local workspace name or connection filter? Credentials and the Executor organization stay unchanged.",
    rename: "Rename this local workspace profile? Its aliases will change; its credential identity stays the same.",
    switch: "Make this workspace the default for native commands? Existing AI calls keep their explicit targets.",
    verify: "Verify this profile against Executor and save its reported organization?",
    remove:
      "Remove this local profile and its stored API key? This does not delete the Executor organization or revoke the key. Saved tools and approval references remain local.",
  };
  return {
    message: messages[input.operation],
    info: [
      { name: "Profile", value: workspace.name },
      ...(input.name !== undefined ? [{ name: "New Name", value: input.name.trim() }] : []),
      ...(input.defaultOwner !== undefined
        ? [
            {
              name: "Connections",
              value:
                input.defaultOwner === "all"
                  ? "All Connections"
                  : input.defaultOwner === "org"
                    ? "Workspace"
                    : "Personal",
            },
          ]
        : []),
    ],
  };
}

export async function changeAiWorkspace(input: WorkspaceChangeInput) {
  const workspace = changeTarget(input);
  switch (input.operation) {
    case "update":
    case "rename": {
      const updated = {
        ...workspace,
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.defaultOwner !== undefined ? { defaultOwner: input.defaultOwner } : {}),
      };
      await saveWorkspace(updated);
      return { operation: input.operation, profile: workspaceSummary(updated) };
    }
    case "verify": {
      const verified = await verifyWorkspace(workspace);
      await saveWorkspace(verified);
      return { operation: input.operation, profile: workspaceSummary(verified) };
    }
    case "switch":
      await activateWorkspace(workspace.id);
      return { operation: input.operation, activeWorkspaceId: workspace.id };
    case "remove":
      await removeWorkspace(workspace.id);
      return { operation: input.operation, removedWorkspaceId: workspace.id };
  }
}
