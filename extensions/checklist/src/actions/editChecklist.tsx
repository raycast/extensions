import { Action, Icon, Keyboard } from "@raycast/api";
import CreateChecklistForm from "../components/createChecklist";
import type { Checklist } from "../types";

function EditChecklistAction(props: { onCreate: (checklist: Omit<Checklist, "id">) => void; checklist: Checklist }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Edit Checklist"
      shortcut={Keyboard.Shortcut.Common.Edit}
      target={
        <CreateChecklistForm onCreate={props.onCreate} checklist={props.checklist} actionLabel="Update Checklist" />
      }
    />
  );
}

export default EditChecklistAction;
