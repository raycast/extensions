import { Action, Icon, Keyboard } from "@raycast/api";
import CreateChecklistForm from "../components/createChecklist";
import type { Checklist } from "../types";

function CreateChecklistAction(props: { onCreate: (checklist: Omit<Checklist, "id">) => void }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Create Quest"
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CreateChecklistForm onCreate={props.onCreate} actionLabel="Create Checklist" />}
    />
  );
}

export default CreateChecklistAction;
