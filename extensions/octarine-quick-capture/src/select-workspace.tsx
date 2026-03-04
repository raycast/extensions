import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  getConfiguredWorkspaces,
  getSelectedWorkspace,
  setSelectedWorkspace,
} from "./utils/workspace";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [selectedWorkspace, setSelectedWorkspaceState] = useState<
    string | undefined
  >();

  const loadWorkspaceState = useCallback(async () => {
    setIsLoading(true);

    const availableWorkspaces = getConfiguredWorkspaces();
    const selected = await getSelectedWorkspace();

    setWorkspaces(availableWorkspaces);
    setSelectedWorkspaceState(selected);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadWorkspaceState();
  }, [loadWorkspaceState]);

  async function handleSelectWorkspace(workspacePath: string) {
    await setSelectedWorkspace(workspacePath);
    setSelectedWorkspaceState(workspacePath);

    await showToast({
      style: Toast.Style.Success,
      title: "Workspace selected",
      message: workspacePath,
    });
  }

  const emptyActions = (
    <ActionPanel>
      <Action
        title="Open Extension Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={loadWorkspaceState}
      />
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading}>
      {workspaces.length === 0 ? (
        <List.EmptyView
          title="No Workspace Paths Configured"
          description="Set one or more vault paths in extension preferences (comma or newline separated)."
          actions={emptyActions}
        />
      ) : (
        workspaces.map((workspacePath) => (
          <List.Item
            key={workspacePath}
            title={workspacePath}
            accessories={
              workspacePath === selectedWorkspace ? [{ tag: "Selected" }] : []
            }
            actions={
              <ActionPanel>
                <Action
                  title="Select Workspace"
                  icon={Icon.Checkmark}
                  onAction={() => handleSelectWorkspace(workspacePath)}
                />
                <Action
                  title="Open Extension Preferences"
                  icon={Icon.Gear}
                  onAction={openExtensionPreferences}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={loadWorkspaceState}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
