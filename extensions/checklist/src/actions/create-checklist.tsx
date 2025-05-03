import { Action, Icon, Keyboard } from "@raycast/api";
import { CreateChecklistForm } from "../components/create-checklist";
import type { Checklist } from "../types";

export function CreateChecklistAction(props: { onCreate: (checklist: Checklist) => void }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Create Checklist"
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CreateChecklistForm onCreate={props.onCreate} actionLabel="Create Checklist" />}
    />
  );
}
