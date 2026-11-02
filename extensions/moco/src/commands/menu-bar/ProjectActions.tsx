import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Project } from "../projects/types";
import { finishMenuBarForm } from "../../utils/refresh";
import { setStatus, StatusType } from "../../utils/storage";

// Actions for a project, opened from the ⚙ row of a project in the menu bar.
export const ProjectActions = ({ project }: { project: Pick<Project, "id" | "name"> }) => {
  const hide = async () => {
    await setStatus("project", project.id, StatusType.hidden);
    await finishMenuBarForm();
  };

  return (
    <List navigationTitle={project.name} searchBarPlaceholder="Filter actions...">
      <List.Item
        icon={Icon.EyeDisabled}
        title="Hide Project"
        subtitle="Unhide via Hidden Projects in the menu bar or the project list"
        actions={
          <ActionPanel>
            <Action title="Hide Project" icon={Icon.EyeDisabled} onAction={hide} />
          </ActionPanel>
        }
      />
    </List>
  );
};
