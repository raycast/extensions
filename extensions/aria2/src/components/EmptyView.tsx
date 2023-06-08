import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import CreateTaskForm from "./CreateTaskForm";

function EmptyView() {
  return (
    <List.EmptyView
      icon="😕"
      title="No Tasks"
      description={`Can't find matching task.\nCreate it now!`}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.PlusCircle}
            title="Add Task"
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<CreateTaskForm />}
          />
        </ActionPanel>
      }
    />
  );
}

export default EmptyView;
