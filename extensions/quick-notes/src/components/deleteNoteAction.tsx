import { Action, Alert, Color, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { useAtom } from "jotai";
import { notesAtom } from "../services/atoms";
import { getTintColor } from "../utils/utils";

const DeleteNoteAction = ({ createdAt }: { createdAt?: Date }) => {
  const [notes, setNotes] = useAtom(notesAtom);
  const deleteNote = async () => {
    const alertOptions = {
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: "Are you sure?",
      message: "Deleting your note cannot be undone.",
      primaryAction: {
        title: "Confirm",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(alertOptions)) {
      const updatedNotes = notes.filter((n) => n.createdAt !== createdAt);
      await setNotes(updatedNotes);
      showToast({
        style: Toast.Style.Success,
        title: "Deleted Note",
      });
    }
  };

  if (!createdAt) return null;
  return (
    <Action
      title="Delete Note"
      icon={{
        source: Icon.Trash,
        tintColor: getTintColor("red"),
      }}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
      onAction={deleteNote}
    />
  );
};

export default DeleteNoteAction;
