import { Action, Icon } from "@raycast/api";
import CreateQuestForm from "../components/createQuest";
import type { Quest } from "../types";

function EditQuestAction(props: { onCreate: (quest: Omit<Quest, "id">) => void; quest: Quest }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Edit Quest"
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      target={<CreateQuestForm onCreate={props.onCreate} quest={props.quest} actionLabel="Update Quest" />}
    />
  );
}

export default EditQuestAction;
