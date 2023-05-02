import { List, ActionPanel, PushAction, Icon } from "@raycast/api";
import { Project, Task } from "../types";
import { TaskList } from "../views";

export function ProjectListItem({
  project,
  timeRecords,
  refreshRecords,
}: {
  project: Project;
  timeRecords: Array<Task>;
  refreshRecords: () => Promise<Array<Task>>;
}) {
  return (
    <List.Item
      id={project.id}
      key={project.id}
      title={project.name}
      icon={Icon.Document}
      actions={
        <ActionPanel>
          <PushAction
            title="Select Project"
            target={<TaskList refreshRecords={refreshRecords} timeRecords={timeRecords} projectId={project.id} />}
          />
        </ActionPanel>
      }
    />
  );
}
