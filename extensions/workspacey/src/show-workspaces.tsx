import {
  ActionPanel,
  Action,
  showToast,
  List,
  useNavigation,
  Icon,
  Toast,
  Keyboard,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { deleteWorkspace, getWorkspaces, getWorkspacesDataForWorkspaceId } from "./data/util/storage";
import { useEffect, useState } from "react";
import { Workspace } from "./data/workspace";
import AddActionsForm from "./add-actions";
import ShowActionsForm from "./show-actions";
import SelectiveStartForm from "./selective-start";
import { executeAction } from "./data/util/executeAction";

export default function Command() {
  const navigation = useNavigation();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    getWorkspaces()
      .then((workspaces) => {
        setWorkspaces(workspaces);
      })
      .catch(console.error);
  }, []);

  return (
    <List>
      {workspaces.map((workspace) => (
        <List.Item
          icon={Icon.Sidebar}
          key={workspace.id}
          title={workspace.name}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Power}
                title="Start"
                onAction={() => {
                  getWorkspacesDataForWorkspaceId(workspace.id)
                    .then(async (workspaceData) => {
                      if (workspaceData && workspaceData.actions.length > 0) {
                        workspaceData.actions.forEach((action) => {
                          executeAction(action);
                        });
                      } else {
                        await showToast(Toast.Style.Failure, "No Actions", "No actions found for this workspace");
                      }
                    })
                    .catch(console.error);
                }}
              />

              <Action
                icon={Icon.CheckCircle}
                title="Selective Start"
                onAction={() => navigation.push(<SelectiveStartForm workspace={workspace} />)}
              />
              <Action
                icon={Icon.Eye}
                title="View Actions"
                onAction={() => navigation.push(<ShowActionsForm workspace={workspace} />)}
                shortcut={{ modifiers: ["ctrl"], key: "v" }}
              />
              <Action
                icon={Icon.Plus}
                title="New Action"
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={() => {
                  navigation.push(<AddActionsForm workspace={workspace} />);
                }}
              />

              <Action
                icon={Icon.Trash}
                title="Delete"
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={async () => {
                  const options: Alert.Options = {
                    title: "Delete Workspace?",
                    primaryAction: {
                      title: "Delete",
                      style: Alert.ActionStyle.Destructive,
                      onAction: async () => {
                        await deleteWorkspace(workspace.id);
                        setWorkspaces(workspaces.filter((w) => w.id !== workspace.id));
                        await showToast(Toast.Style.Success, "Workspace Deleted");
                      },
                    },
                  };
                  await confirmAlert(options);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
