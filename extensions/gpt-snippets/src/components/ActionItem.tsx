import { Action, ActionPanel, Alert, Icon, List, useNavigation } from "@raycast/api";
import handleAction from "../utils/handleAction";
import AddActionForm from "./AddActionForm";
import { useConfig } from "../hooks/ConfigContext";
import DetailsPage from "./DetailsPage";

export function ActionItem({ item, setSelectedAction, refreshActions }: any) {
  const { push } = useNavigation();
  const { addAction, deleteAction } = useConfig();
  return (
    <List.Item
      key={item.id}
      title={item.title}
      icon={Icon[item.icon as keyof typeof Icon]}
      actions={
        <ActionPanel>
          <Action title="Run with GPT" onAction={() => handleAction(item, setSelectedAction, push)} icon={Icon.Play} />
          <Action.Push
            title="Show Action Details"
            target={<DetailsPage action={item} />}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            icon={Icon.Info}
          />
          <Action.Push
            title="Add New Action"
            target={<AddActionForm onAdd={refreshActions} addAction={addAction} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            icon={Icon.Plus}
          />
          <Action
            title="Delete Action"
            //@ts-ignore
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
