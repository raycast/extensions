import type { FC } from "react";
import type { LocalDocumentReferences } from "../../types";
import { Action, Icon, confirmAlert, Alert, Color, showToast, Toast } from "@raycast/api";
import { docs } from "../../utils";

interface Props {
  doc: {
    name: string;
    isActive: boolean;
  };
  revalidate: () => Promise<LocalDocumentReferences>;
}

export const DeleteDocumentAction: FC<Props> = ({ doc, revalidate }) => {
  // reval
  const handleDeleteDocument = async () => {
    if (doc.isActive) {
      await showToast(Toast.Style.Failure, "Cannot delete active document");
      return;
    }

    try {
      if (
        await confirmAlert({
          title: `Delete document "${doc.name}"?`,
          message: "Are you sure you want to delete this document? This action cannot be undone.",
          icon: Icon.Trash,
          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
          dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
        })
      ) {
        await docs.delete({ documentName: doc.name });
        await revalidate();
        await showToast(Toast.Style.Success, `Deleted document "${doc.name}"`);
      }
    } catch (error) {
      console.log(error);
      await showToast(Toast.Style.Failure, `Failed to delete document "${doc.name}"`);
      return;
    }
  };

  return (
    <Action
      icon={{ source: Icon.Trash, tintColor: Color.Red }}
      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
      title="Delete Document"
      onAction={handleDeleteDocument}
    />
  );
};
