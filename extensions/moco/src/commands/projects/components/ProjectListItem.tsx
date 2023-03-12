import { Action, ActionPanel, List, Icon, LocalStorage } from "@raycast/api";
import { Project } from "../types";
import { TaskList } from "../../tasks/components/TaskList";
import { ActivityList } from "../../activities/components/ActivityList";
import { setStatus, removeStatus, getStatus, StatusType } from "../../utils/storage";

interface Props {
  index: number;
  project: Project;
  updateProject: (index: number, newValue: Project) => void;
}

export const ProjectListItem: React.FC<Props> = ({ index, project, updateProject }) => {
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
          <Action
            title="Add Project to Favorites"
            onAction={() => setStatus(project, StatusType.favorite).then(() => console.log(LocalStorage.allItems()))}
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action
            title="Remove Project from Favorites"
            onAction={() => removeStatus(project)}
            icon={Icon.StarDisabled}
          />
          <Action title="Hide Project" onAction={() => setStatus(project, StatusType.hidden)} icon={Icon.XMarkCircle} />
        </ActionPanel>
      }
    />
  );
};
