import { Action, ActionPanel, Alert, Icon, List, useNavigation } from "@raycast/api";
import handleAction from "../utils/handleAction";
import AddActionForm from "./AddActionForm";
import { useConfig } from "../hooks/ConfigContext";
import DetailsPage from "./DetailsPage";
import { IAction } from "../constants/initialActions";

interface ActionItemProps {
  item: IAction;
  refreshActions: () => void;
}

export function ActionItem({ item, refreshActions }: ActionItemProps) {
  const { push } = useNavigation();
  const { addAction, deleteAction } = useConfig();
  return (
    <List.Item
      key={item.id}
      title={item.title}
      icon={Icon[item.icon as keyof typeof Icon]}
      actions={
        <ActionPanel>
          <Action title="Run with GPT" onAction={() => handleAction(item, push)} icon={Icon.Play} />
          <Action.Push
            title="Show IAction Details"
            target={<DetailsPage action={item} />}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            icon={Icon.Info}
          />
          <Action.Push
            title="Add New IAction"
            target={<AddActionForm onAdd={refreshActions} addAction={addAction} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            icon={Icon.Plus}
          />
          <Action
            title="Delete IAction"
            //@ts-expect-error - Issue with ActionPanel type
            style={Alert.ActionStyle.Destructive}
            icon={Icon.Trash}
            onAction={() => {
              deleteAction(item.id);
              refreshActions();
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          />
        </ActionPanel>
      }
    />
  );
}
