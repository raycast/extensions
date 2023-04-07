import { Action, Icon } from "@raycast/api";
import ViewQuest from "../components/viewQuest";
import type { Quest } from "../types";

function StartQuestAction(props: {
  quest: Quest;
  quests: [Quest[], React.Dispatch<React.SetStateAction<Quest[]>>];
  title: string;
}) {
  return (
    <Action.Push
      icon={Icon.Play}
      title={props.title}
      target={<ViewQuest quest={props.quest} quests={props.quests} />}
    />
  );
}

export default StartQuestAction;
