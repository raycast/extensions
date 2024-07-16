import { Action, Icon, Keyboard } from "@raycast/api";
import { CreateChecklistForm } from "../components/create-checklist";
import type { Checklist } from "../types";

export function EditChecklistAction(props: { onCreate: (checklist: Checklist) => void; checklist: Checklist }) {
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
