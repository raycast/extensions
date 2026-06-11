import { Color, Icon, List } from "@raycast/api";
import { ProjectListItemActions } from "./project-list-item-actions";
import { projectKeywords, projectTitle } from "../lib/project";
import { type Project } from "../lib/project-store";
import {
  type SaveProjectHandler,
  type SaveProjectIconHandler,
} from "./project-list-item-actions";

/* eslint-disable no-unused-vars */
type ProjectListItemProps = {
  item: Project;
  onToggleFavorite: (project: Project) => void;
  onRemoveProject: (project: Project) => Promise<void>;
  onSaveProject: SaveProjectHandler;
  onSaveProjectIcon: SaveProjectIconHandler;
};
/* eslint-enable no-unused-vars */

export function ProjectListItem({
  item,
  onToggleFavorite,
  onRemoveProject,
  onSaveProject,
  onSaveProjectIcon,
}: ProjectListItemProps) {
  return (
    <List.Item
      title={projectTitle(item)}
      subtitle={item.worktree}
      keywords={projectKeywords(item)}
      accessories={[
        ...(item.isFavorite
          ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }]
          : []),
        ...(item.sandboxCount
          ? [
              {
                tag: `${item.sandboxCount} sandbox${item.sandboxCount === 1 ? "" : "es"}`,
              },
            ]
          : []),
      ]}
      icon={item.icon ? { source: item.icon } : undefined}
      actions={
        <ProjectListItemActions
          item={item}
          onToggleFavorite={onToggleFavorite}
          onRemoveProject={onRemoveProject}
          onSaveProject={onSaveProject}
          onSaveProjectIcon={onSaveProjectIcon}
        />
      }
    />
  );
}
