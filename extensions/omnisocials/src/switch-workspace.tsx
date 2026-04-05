import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getWorkspaces,
  getActiveWorkspaceId,
  setActiveWorkspaceId,
  migrateGlobalApiKey,
} from "./lib/workspaces";
import type { WorkspaceProfile } from "./lib/types";

export default function SwitchWorkspaceCommand() {
  const [workspaces, setWorkspaces] = useState<WorkspaceProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    await migrateGlobalApiKey();
    const ws = await getWorkspaces();
    const active = await getActiveWorkspaceId();
    setWorkspaces(ws);
    setActiveId(active);
    setIsLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  if (!isLoading && workspaces.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No workspaces configured"
          description='Use the "Manage Workspaces" command to add your first workspace'
          icon={Icon.Building}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Switch workspace...">
      {workspaces.map((ws) => {
        const isActive = ws.id === activeId;
        return (
          <List.Item
            key={ws.id}
            title={(ws.icon ? ws.icon + "  " : "") + ws.name}
            icon={
              isActive
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : Icon.Building
            }
            accessories={
              isActive ? [{ tag: { value: "Active", color: Color.Green } }] : []
            }
            actions={
              <ActionPanel>
                <Action
                  title={isActive ? "Already Active" : `Switch to ${ws.name}`}
                  icon={Icon.ArrowRight}
                  onAction={async () => {
                    if (isActive) return;
                    await setActiveWorkspaceId(ws.id);
                    await showToast({
                      style: Toast.Style.Success,
                      title: `Switched to ${ws.name}`,
                    });
                    refresh();
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
