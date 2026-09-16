import { Action, Alert, Icon, Keyboard, Toast, confirmAlert, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useRef } from "react";
import { deleteExecutorItem, deletionConfirmation, type DeletionTarget } from "../lib/deletions";
import { workspaceConfirmationMessage } from "../lib/workspaces";

export function DeleteExecutorItemAction({ target, onDeleted }: { target: DeletionTarget; onDeleted: () => void }) {
  const busy = useRef(false);
  const noun = target.kind === "connection" ? "Connection" : "Integration";

  async function onAction() {
    if (busy.current) return;
    busy.current = true;
    try {
      const details = await deletionConfirmation(target);
      if (
        !(await confirmAlert({
          title: `Delete ${noun}?`,
          message: workspaceConfirmationMessage(
            [...(details.info ?? []).map(({ name, value }) => `${name}: ${value}`), "", details.message].join("\n"),
          ),
          icon: Icon.Trash,
          primaryAction: { title: `Delete ${noun}`, style: Alert.ActionStyle.Destructive },
        }))
      )
        return;
      const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting ${noun}` });
      try {
        await deleteExecutorItem(target);
        toast.style = Toast.Style.Success;
        toast.title = `${noun} Deleted`;
        onDeleted();
      } catch (error) {
        toast.hide();
        throw error;
      }
    } catch (error) {
      await showFailureToast(error, { title: `Could Not Delete ${noun}` });
    } finally {
      busy.current = false;
    }
  }

  return (
    <Action
      title={`Delete ${noun}`}
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={Keyboard.Shortcut.Common.Remove}
      onAction={onAction}
    />
  );
}
