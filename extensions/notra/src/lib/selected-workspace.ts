import type { Organization } from "../types";

// The workspace chosen by the running command. Imperative API calls and pushed views read it so every request
// carries the same organization header as the command's own data hooks.
let selectedWorkspace: Organization | undefined;

export function getSelectedWorkspace(): Organization | undefined {
  return selectedWorkspace;
}

export function setSelectedWorkspace(workspace: Organization | undefined): void {
  selectedWorkspace = workspace;
}
