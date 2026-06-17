import { Action, Alert, confirmAlert, Icon, LocalStorage, popToRoot, showToast, Toast } from "@raycast/api";

interface IProps {
  id: string;
}

export const RemoveCustomCommandAction = ({ id }: IProps) => {
  return (
    <Action
      title="Remove Command"
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={async () => {
        const isAlertConfirmed = await confirmAlert({
          title: "Delete the command?",
          message: "You will not be able to recover it",
          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
        });
        if (isAlertConfirmed) {
          try {
            await LocalStorage.removeItem(id);
            showToast({ title: "Successfully deleted" });
          } catch (error) {
            showToast({ title: "An error occured", style: Toast.Style.Failure });
          } finally {
            popToRoot();
          }
        }
      }}
      icon={Icon.Trash}
      style={Action.Style.Destructive}
    />
  );
};
