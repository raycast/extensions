import { ActionPanel, List } from "@raycast/api";
import { Quest } from "../types";
import CreateQuestAction from "../actions/createQuest";

function EmptyView(props: { quests: Quest[]; onCreate: (quest: Omit<Quest, "id">) => void }) {
  return (
    <List.EmptyView
      icon="🥳"
      title="Welcome to Quest!"
      description={`Start by creating your first quest. \nPress CMD+N to get started.`}
      actions={
        <ActionPanel>
          <CreateQuestAction onCreate={props.onCreate} />
        </ActionPanel>
      }
    />
  );
}

export default EmptyView;
