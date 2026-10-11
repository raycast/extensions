export type OpenWorkspaceLaunchContext = {
  focusWorkspaceId?: string;
  focusWorkspaceName?: string;
  /** Open the create form, optionally seeded with this directory. */
  createDirectory?: string;
  /** Open the edit form for this workspace id. */
  editWorkspaceId?: string;
  /** Open discover-git flow as the initial hub view. */
  mode?: "list" | "create" | "edit" | "discover";
};

export function resolveOpenWorkspaceSearchSeed(
  fallbackText?: string,
  launchContext?: OpenWorkspaceLaunchContext,
): string {
  return (
    fallbackText?.trim() || launchContext?.focusWorkspaceName?.trim() || launchContext?.focusWorkspaceId?.trim() || ""
  );
}

export function resolveOpenWorkspaceInitialMode(
  launchContext?: OpenWorkspaceLaunchContext,
): "list" | "create" | "edit" | "discover" {
  if (launchContext?.mode === "discover") {
    return "discover";
  }
  if (launchContext?.mode === "create" || launchContext?.createDirectory !== undefined) {
    return "create";
  }
  if (launchContext?.mode === "edit" || launchContext?.editWorkspaceId?.trim()) {
    return "edit";
  }
  return "list";
}
