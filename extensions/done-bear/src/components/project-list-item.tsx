import { Action, ActionPanel, Icon, List } from "@raycast/api";

import type { ProjectRecord } from "../api/types";
import { PROJECT_STATUS_ICONS } from "../helpers/constants";

interface ProjectListItemProps {
  project: ProjectRecord;
}

export const ProjectListItem = ({ project }: ProjectListItemProps) => {
  const icon = PROJECT_STATUS_ICONS[project.status] || Icon.Folder;
  const accessories: List.Item.Accessory[] = [];

  if (project.targetDate) {
    accessories.push({ date: new Date(project.targetDate) });
  }

  accessories.push({ tag: project.key });

  return (
    <List.Item
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            content={project.name}
            shortcut={{ key: "c", modifiers: ["cmd"] }}
            title="Copy Name"
          />
          <Action.CopyToClipboard
            content={project.id}
            shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
            title="Copy ID"
          />
          <Action.CopyToClipboard content={project.key} title="Copy Key" />
        </ActionPanel>
      }
      icon={icon}
      subtitle={project.description?.split("\n")[0] || undefined}
      title={project.name}
    />
  );
};
