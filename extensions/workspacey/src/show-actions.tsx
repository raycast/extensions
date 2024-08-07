import {
  ActionPanel,
  Action,
  showToast,
  List,
  useNavigation,
  Icon,
  confirmAlert,
  Alert,
  Toast,
  Keyboard,
} from "@raycast/api";
import { deleteAction, getWorkspacesDataForWorkspaceId } from "./data/util/storage";
import { useEffect, useState } from "react";
import { Workspace } from "./data/workspace";
import AddActionsForm from "./add-actions";
import { WorkspaceData } from "./data/workspace-data";
import { ActionType } from "./data/actionType";
import { getActionIcon } from "./data/util/getActionIcon";
import { executeAction } from "./data/util/executeAction";
import ViewNoteForm from "./view-note";

export default function ShowActionsForm(props: { workspace: Workspace }) {
  const { workspace } = props;
  const navigation = useNavigation();
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData | undefined>(undefined);

  useEffect(() => {
    getWorkspacesDataForWorkspaceId(workspace.id)
      .then((workspaceData) => {
        setWorkspaceData(workspaceData);
      })
      .catch(console.error);
  }, []);

  return (
    <List navigationTitle="Show Actions">
      {workspaceData?.actions.map((action) => (
        <List.Item
          icon={getActionIcon(action.type)}
          key={action.id}
          title={action.name}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Pencil}
                title="Edit"
                onAction={() => navigation.push(<AddActionsForm workspace={workspace} action={action} />)}
              />
              <Action
                icon={action.type === ActionType.Note ? Icon.Eye : Icon.Power}
                title={action.type === ActionType.Note ? "View Note" : "Execute"}
                onAction={() => {
                  if (action.type === ActionType.Note) {
                    navigation.push(<ViewNoteForm noteName={action.name} text={action.target} />);
                  } else {
                    executeAction(action);
                  }
                }}
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
                    title: "Delete Action?",
                    primaryAction: {
                      title: "Delete",
                      style: Alert.ActionStyle.Destructive,
                      onAction: async () => {
                        await deleteAction(workspaceData.workspace.id, action.id);
                        setWorkspaceData({
                          ...workspaceData,
                          actions: workspaceData?.actions.filter((a) => a.id !== action.id) || [],
                        });
                        await showToast(Toast.Style.Success, "Action Deleted");
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
