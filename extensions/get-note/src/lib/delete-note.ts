import { Action, Alert, Toast, confirmAlert, showToast } from "@raycast/api";

import { deleteNote } from "./api";
import { normalizeGetNoteError } from "./errors";

export async function deleteNoteWithConfirmation(noteId: string): Promise<boolean> {
  const confirmed = await confirmAlert({
    title: "Move Note to Trash",
    message: "This note will be moved to the GetNote trash.",
    primaryAction: {
      title: "Move to Trash",
      style: Alert.ActionStyle.Destructive,
    },
    dismissAction: {
      title: "Cancel",
      style: Alert.ActionStyle.Cancel,
    },
  });

  if (!confirmed) {
    return false;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Moving Note to Trash",
  });

  try {
    await deleteNote(noteId);
    toast.style = Toast.Style.Success;
    toast.title = "Note Moved to Trash";
    toast.message = noteId;
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to Delete Note";
    toast.message = normalizeGetNoteError(error);
    return false;
  }
}

export const deleteActionStyle = Action.Style.Destructive;
