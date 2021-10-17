import { List, ActionPanel, PushAction, Icon } from "@raycast/api";
import { Project } from "../types";
import { TaskList } from "../views";

export function ProjectListItem({ project }: { project: Project }) {
  return (
    <List.Item
      id={project.id}
      key={project.id}
      title={project.name}
      icon={Icon.Document}
      actions={
        <ActionPanel>
          <PushAction title="Select Project" target={<TaskList projectId={project.id} />} />
        </ActionPanel>
      }
    />
  );
}
