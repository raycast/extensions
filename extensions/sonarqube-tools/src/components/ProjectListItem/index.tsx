import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { Project } from "../../utils";
import { __ } from "../../i18n";

interface ProjectListItemProps {
  project: Project;
  onStartAnalyze: (path: string, name: string) => void;
}

/**
 * Component for rendering an individual project item
 * Extracted to make the main component simpler and more testable
 */
export function ProjectListItem({ project, onStartAnalyze }: ProjectListItemProps) {
  return (
    <List.Item
      key={project.id}
      icon={Icon.Terminal}
      title={project.name}
      subtitle={project.path}
      actions={
        <ActionPanel title={`${__("projects.form.name")}: ${project.name}`}>
          <Action
            title={__("commands.allInOne.actionTitle")}
            icon={Icon.Play}
            onAction={() => onStartAnalyze(project.path, project.name)}
          />
        </ActionPanel>
      }
    />
  );
}
