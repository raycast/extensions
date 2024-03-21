import { Action, Alert, Icon, confirmAlert } from "@raycast/api";

export default function DeleteStorybookAction(props: { name: string; id: string; onDelete: (id: string) => void }) {
  const confirmAlertOptions: Alert.Options = {
    title: `Delete ${props.name}?`,
    icon: Icon.Trash,
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
      onAction: () => {
        props.onDelete(props.id);
      },
    },
  };

  return (
    <Action
      icon={Icon.Trash}
      title="Delete Storybook"
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      style={Action.Style.Destructive}
      onAction={async () => {
        await confirmAlert(confirmAlertOptions);
      }}
    />
  );
}
