import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { fetchWorkspaces } from "./bridge";
import type { WorkspaceItem } from "./types";

const ALL_WORKSPACES_VALUE = "__all__";

export function useWorkspacePicker() {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(ALL_WORKSPACES_VALUE);
  const [didSetDefault, setDidSetDefault] = useState(false);

  const { data: workspaces } = useCachedPromise(async () => fetchWorkspaces(), [], {
    keepPreviousData: true,
  });

  useEffect(() => {
    if (workspaces && !didSetDefault) {
      const active = workspaces.find((ws) => ws.isActive);
      if (active) {
        setSelectedWorkspaceId(active.id);
        setDidSetDefault(true);
      }
    }
  }, [workspaces, didSetDefault]);

  const effectiveWorkspaceId = selectedWorkspaceId === ALL_WORKSPACES_VALUE ? undefined : selectedWorkspaceId;

  const dropdown =
    workspaces && workspaces.length > 1 ? (
      <List.Dropdown tooltip="Workspace" value={selectedWorkspaceId} onChange={setSelectedWorkspaceId}>
        <List.Dropdown.Item title="All Workspaces" value={ALL_WORKSPACES_VALUE} icon={Icon.Globe} />
        <List.Dropdown.Section title="Workspaces">
          {workspaces.map((ws: WorkspaceItem) => (
            <List.Dropdown.Item
              key={ws.id}
              title={ws.name}
              value={ws.id}
              icon={ws.isActive ? Icon.CheckCircle : Icon.Circle}
            />
          ))}
        </List.Dropdown.Section>
      </List.Dropdown>
    ) : undefined;

  return { workspaceId: effectiveWorkspaceId, dropdown };
}
