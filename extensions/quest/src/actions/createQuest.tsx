import { Action, Icon } from "@raycast/api";
import CreateQuestForm from "../components/createQuest";
import type { Quest } from "../types";

function CreateQuestAction(props: { onCreate: (quest: Omit<Quest, "id">) => void }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Create Quest"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateQuestForm onCreate={props.onCreate} actionLabel="Create Quest" />}
    />
  );
}

export default CreateQuestAction;
