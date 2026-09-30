import { Action, Alert, Color, Icon, Keyboard, Toast, confirmAlert, showToast } from "@raycast/api";
import { useAtom } from "jotai";
import { notesAtom } from "../services/atoms";
import { getTintColor } from "../utils/utils";

const DeleteAllNotesAction = () => {
  const [notes, setNotes] = useAtom(notesAtom);

  const deleteAll = async () => {
    if (notes.length === 0) {
      return;
    }
    const alertOptions = {
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: "Delete all notes?",
      message: `This will delete all ${notes.length} notes and cannot be undone.`,
      primaryAction: {
        title: "Delete All",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(alertOptions)) {
      await setNotes([]);
      showToast({
        style: Toast.Style.Success,
        title: "Deleted All Notes",
      });
    }
  };

  return (
    <Action
      title="Delete All Notes"
      icon={{
        source: Icon.Trash,
        tintColor: getTintColor("red"),
      }}
      shortcut={Keyboard.Shortcut.Common.RemoveAll}
      onAction={deleteAll}
    />
  );
};

export default DeleteAllNotesAction;
