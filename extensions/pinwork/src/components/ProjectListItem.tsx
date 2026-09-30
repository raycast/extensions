/**
 * Reusable project list item component for Raycast lists.
 */

import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import type { Project } from "../api/types";
import { openProject } from "../api/pinwork";
import { parseProjectColor } from "../utils/icons";

interface ProjectListItemProps {
  project: Project;
}

export function ProjectListItem({ project }: ProjectListItemProps) {
  const projectColor = parseProjectColor(project.color);

  const accessories: List.Item.Accessory[] = [];

  // Task count
  if (project.taskCount > 0) {
    accessories.push({
      text: `${project.taskCount} task${project.taskCount === 1 ? "" : "s"}`,
      tooltip: "Active tasks",
    });
  }

  // Archived indicator
  if (project.isArchived) {
    accessories.push({
      icon: { source: Icon.Tray, tintColor: Color.SecondaryText },
      tooltip: "Archived",
    });
  }

  async function handleOpen() {
    await openProject(project.id);
  }

  return (
    <List.Item
      id={project.id}
      title={project.name}
      subtitle={project.note?.split("\n")[0]}
      icon={{ source: Icon.Folder, tintColor: projectColor }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Open in Pinwork"
            icon={Icon.ArrowNe}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={handleOpen}
          />
          <Action.CopyToClipboard
            title="Copy Project Name"
            content={project.name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
