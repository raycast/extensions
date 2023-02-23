import { Action, ActionPanel, List } from "@raycast/api";
import { Project } from "../types";
import { TaskList } from "../../tasks/components/TaskList";
import { ActivityList } from "../../activities/components/ActivityList";

export const ProjectListItem = ({ project }: { project: Project }) => {
  return (
    <List.Item
      key={project.id}
      title={project.name}
      actions={
        <ActionPanel>
          <Action.Push title={`Select Task`} target={<TaskList project={project} />} />

          <Action.Push
            title={"Show recent activities"}
            target={<ActivityList projectID={project.id} />}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
        </ActionPanel>
      }
    />
  );
};
