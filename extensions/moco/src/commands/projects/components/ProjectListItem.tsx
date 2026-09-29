import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { Project } from "../types";
import { TaskList } from "../../tasks/components/TaskList";
import { ActivityList } from "../../activities/components/ActivityList";
import { StatusType } from "../../../utils/storage";

interface Props {
  project: Project;
  status?: StatusType;
  showHidden: boolean;
  onStatusChange: (project: Project, status: StatusType | undefined) => void;
  onToggleShowHidden: () => void;
}

export const ProjectListItem: React.FC<Props> = ({
  project,
  status,
  showHidden,
  onStatusChange,
  onToggleShowHidden,
}) => {
  return (
    <List.Item
      key={project.id}
      title={project.name}
      icon={status === StatusType.favorite ? Icon.Star : undefined}
      subtitle={project.customer?.name}
      actions={
        <ActionPanel>
          <Action.Push title={`Select Task`} target={<TaskList project={project} />} />
          <Action.Push
            title={"Show recent activities"}
            target={<ActivityList projectID={project.id} />}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          {status === StatusType.favorite ? (
            <Action
              title="Remove Project from Favorites"
              onAction={() => onStatusChange(project, undefined)}
              icon={Icon.StarDisabled}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          ) : (
            <Action
              title="Add Project to Favorites"
              onAction={() => onStatusChange(project, StatusType.favorite)}
              icon={Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          )}
          {status === StatusType.hidden ? (
            <Action title="Unhide Project" onAction={() => onStatusChange(project, undefined)} icon={Icon.Eye} />
          ) : (
            <Action
              title="Hide Project"
              onAction={() => onStatusChange(project, StatusType.hidden)}
              icon={Icon.XMarkCircle}
            />
          )}
          <Action
            title={showHidden ? "Hide Hidden Projects" : "Show Hidden Projects"}
            onAction={onToggleShowHidden}
            icon={showHidden ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
          />
          <Action.CopyToClipboard
            title="Copy Project Name"
            content={project.name}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Project ID"
            content={String(project.id)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
        </ActionPanel>
      }
    />
  );
};
