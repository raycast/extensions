import { useCachedState } from "@raycast/utils";

import { useWorkspaces } from "../components/WorkspaceContext";

// Workspace-scoped persisted UI state (§4.5): key gains the ENTRY key (D10), so two
// entries — even two views of the same org under different accounts — never share state.
export function useWorkspaceCachedState<T>(baseKey: string, defaultValue: T): [T, (value: T) => void] {
  const { workspaceKey } = useWorkspaces();
  const [value, setValue] = useCachedState<T>(`${baseKey}-${workspaceKey}`, defaultValue);
  return [value, setValue];
}
