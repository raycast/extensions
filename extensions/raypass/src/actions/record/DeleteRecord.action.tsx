import type { RevalidateRecords } from "../../types";
import { Action, confirmAlert, Alert, showToast, Toast, Icon, Color } from "@raycast/api";
import { records } from "../../utils";
import { documentStore } from "../../context";

interface Props {
  id: string;
  revalidateRecords: RevalidateRecords;
}

export const DeleteRecordAction: React.FC<Props> = ({ id, revalidateRecords }) => {
  const { ref, password } = documentStore.getState();

  const handleDeleteRecord = async () => {
    try {
      if (
        await confirmAlert({
          title: `Delete record "${id}"?`,
          message: "Are you sure you want to delete this record? This action cannot be undone.",
          icon: Icon.Trash,
          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
          dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
        })
      ) {
        await records.delete({ id, password: ref?.isEncrypted ? password : undefined });
        await revalidateRecords();
        await showToast(Toast.Style.Success, "Record deleted successfully");
        return;
      }
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to delete record");
      return;
    }
  };

  return (
    <Action
      title="Delete Record"
      icon={{ source: Icon.Trash, tintColor: Color.Red }}
      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
      onAction={handleDeleteRecord}
    />
  );
};
