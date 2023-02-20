import { Action, ActionPanel, Icon } from "@raycast/api";
import { openTaskManager } from "../../lib/tim";
import NewTask from "../../newTask";

export const GenealActions: React.FC = () => {
  return (
    <ActionPanel.Section title="General">
      <Action.Push title="Create New Task" icon={Icon.Plus} target={<NewTask />} />
      <Action title="Open Task Manager" icon="tim-icon.png" onAction={openTaskManager} />
      <Action title="Open Active Record" icon="tim-icon.png" onAction={openTaskManager} />
    </ActionPanel.Section>
  );
};
