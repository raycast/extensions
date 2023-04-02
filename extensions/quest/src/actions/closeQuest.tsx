import { Action, Icon } from "@raycast/api";
import type { Quest } from "../types";

function CloseQuestAction(props: { quests: [Quest[], React.Dispatch<React.SetStateAction<Quest[]>>]; quest: Quest }) {
  const [quests, setQuests] = props.quests;

  async function closeQuest(quest: Quest) {
    const questIndex = quests.findIndex((q) => q.id === quest.id);

    const newQuests = [...quests];

    newQuests[questIndex].tasks = newQuests[questIndex].tasks.map((task) => ({ ...task, isCompleted: false }));
    newQuests[questIndex].isStarted = false;
    newQuests[questIndex].progress = 0;
    setQuests(newQuests);
  }

  return (
    <Action
      icon={Icon.Trash}
      title="Close Quest"
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={() => closeQuest(props.quest)}
    />
  );
}

export default CloseQuestAction;
