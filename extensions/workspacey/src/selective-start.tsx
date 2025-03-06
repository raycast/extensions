import { ActionPanel, Action, List, Icon, Keyboard } from "@raycast/api";
import { getWorkspacesDataForWorkspaceId } from "./data/util/storage";
import { useEffect, useState } from "react";
import { Workspace } from "./data/workspace";
import { WorkspaceData } from "./data/workspace-data";
import { getActionIcon } from "./data/util/getActionIcon";
import { ActionData } from "./data/action-data";
import { executeAction } from "./data/util/executeAction";

export default function SelectiveStartForm(props: { workspace: Workspace }) {
  const { workspace } = props;
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData | undefined>(undefined);
  const [selectedItems, setSelectedItems] = useState<ActionData[]>([]);

  useEffect(() => {
    getWorkspacesDataForWorkspaceId(workspace.id)
      .then((workspaceData) => {
        setWorkspaceData(workspaceData);
        setSelectedItems(workspaceData?.actions || []);
      })
      .catch(console.error);
  }, []);

  function toggleItem(isSelected: boolean, action: ActionData): void {
    if (isSelected) {
      setSelectedItems(selectedItems.filter((item) => item.id !== action.id));
    } else {
      setSelectedItems([...selectedItems, action]);
    }
  }
  function startActions(): void {
    selectedItems.forEach((action) => {
      executeAction(action);
    });
  }

  return (
    <List navigationTitle="Selective Start">
      {workspaceData?.actions.map((action) => {
        const isSelected = selectedItems.includes(action);

        return (
          <List.Item
            icon={getActionIcon(action.type)}
            key={action.id}
            title={action.name}
            accessories={[
              {
                icon: isSelected ? { source: Icon.CheckCircle, tintColor: "green" } : Icon.Circle,
              },
            ]}
            actions={
              <ActionPanel>
                <Action title={isSelected ? "Deselect" : "Select"} onAction={() => toggleItem(isSelected, action)} />

                <Action icon={Icon.Power} title="Start" onAction={startActions} />

                <Action
                  icon={Icon.CheckCircle}
                  title="Select All"
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "a" }}
                  onAction={() => {
                    setSelectedItems(workspaceData.actions);
                  }}
                />
                <Action
                  icon={Icon.Circle}
                  title="Deselect All"
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  onAction={() => {
                    setSelectedItems([]);
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
