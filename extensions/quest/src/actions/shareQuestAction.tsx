import { Action, Icon } from "@raycast/api";
import { sharableQuest } from "../lib/util";
import { Quest } from "../types";

function ShareQuestAction(props: { quest: Quest }) {
  return (
    <Action.CopyToClipboard
      icon={Icon.Link}
      title="Share Quest"
      content={JSON.stringify(sharableQuest(props.quest))}
      shortcut={{ modifiers: ["cmd"], key: "." }}
    />
  );
}

export default ShareQuestAction;
