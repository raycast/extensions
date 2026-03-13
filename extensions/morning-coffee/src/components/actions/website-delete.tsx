import { Action, Alert, confirmAlert, Icon } from "@raycast/api";

interface ActionWebsiteDeleteInterface {
  onDelete(): void;
}

export const ActionWebsiteDelete = ({ onDelete }: ActionWebsiteDeleteInterface) => {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete Website"
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={async () => {
        const options: Alert.Options = {
          title: "Are you sure to delete the website?",
          primaryAction: {
            title: "Delete",
            onAction: onDelete,
            style: Alert.ActionStyle.Destructive,
          },
        };
        await confirmAlert(options);
      }}
    />
  );
};

export default ActionWebsiteDelete;
