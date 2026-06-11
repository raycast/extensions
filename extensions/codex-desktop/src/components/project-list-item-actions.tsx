import { Action, ActionPanel, Icon } from "@raycast/api";
import {
  EditProjectForm,
  type EditProjectFormValues,
} from "./edit-project-form";
import { RelatedWorktreesList } from "./related-worktrees-list";
import { openProject, openProjectRemote } from "../lib/codex";
import { type Project } from "../lib/project-store";

/* eslint-disable no-unused-vars */
export type SaveProjectHandler = (
  project: Project,
  values: EditProjectFormValues,
) => Promise<boolean>;
export type SaveProjectIconHandler = (project: Project) => Promise<boolean>;
/* eslint-enable no-unused-vars */

type ProjectListItemActionsProps = {
  item: Project;
  /* eslint-disable no-unused-vars */
  onToggleFavorite: (project: Project) => void;
  onRemoveProject: (project: Project) => Promise<void>;
  /* eslint-enable no-unused-vars */
  onSaveProject: SaveProjectHandler;
  onSaveProjectIcon: SaveProjectIconHandler;
};

export function ProjectListItemActions({
  item,
  onToggleFavorite,
  onRemoveProject,
  onSaveProject,
  onSaveProjectIcon,
}: ProjectListItemActionsProps) {
  return (
    <ActionPanel>
      <Action
        title="Open in Codex"
        icon={Icon.Terminal}
        onAction={async () => {
          await openProject(item.worktree);
        }}
      />
      <Action
        title={item.isFavorite ? "Unfavorite Project" : "Favorite Project"}
        icon={item.isFavorite ? Icon.StarDisabled : Icon.Star}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        onAction={() => onToggleFavorite(item)}
      />
      <Action.Push
        title="Open Related Worktrees"
        icon={Icon.Folder}
        shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
        target={<RelatedWorktreesList item={item} />}
      />
      <Action.Push
        title="Edit Project"
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        target={<EditProjectForm item={item} onSave={onSaveProject} />}
      />
      <Action.Push
        title="Rename Project"
        icon={Icon.TextCursor}
        target={<EditProjectForm item={item} onSave={onSaveProject} />}
      />
      <Action
        title={item.hasIcon ? "Change Project Icon" : "Add Project Icon"}
        icon={Icon.Image}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
        onAction={async () => {
          await onSaveProjectIcon(item);
        }}
      />
      <Action
        title="Open Remote in Browser"
        icon={Icon.Globe}
        shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
        onAction={async () => {
          await openProjectRemote(item.worktree);
        }}
      />
      <Action
        title="Remove Project from Codex"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        onAction={async () => {
          await onRemoveProject(item);
        }}
      />
      <Action.CopyToClipboard title="Copy Path" content={item.worktree} />
      <Action.ShowInFinder title="Show in Finder" path={item.worktree} />
    </ActionPanel>
  );
}
