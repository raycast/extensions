import { Action, Icon } from "@raycast/api";
import { isNavigableDirectory } from "$lib/item-behavior";
import { SharedActionPanel } from "../shared/action-panel";
import type { ItemActionsProps } from "./types";

export const ItemActions = ({
  entry,
  directoryTarget,
  symlinkDirectoryTarget,
  editTarget,
  onTrashItems,
  revalidate,
}: ItemActionsProps) => {
  const primaryAction =
    isNavigableDirectory(entry) && directoryTarget ? (
      <Action.Push title="Open in Browser" icon={Icon.Folder} target={directoryTarget} />
    ) : null;

  const secondaryAction = <Action.Open title="Open" target={entry.path} icon={Icon.ArrowRightCircle} />;

  const symlinkAction =
    entry.type === "symlink" && symlinkDirectoryTarget ? (
      <Action.Push
        title="Open Target in Browser"
        icon={Icon.Folder}
        target={symlinkDirectoryTarget}
        shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
      />
    ) : null;

  const editAction = editTarget ? (
    <Action.Push title="Edit" icon={Icon.Pencil} target={editTarget} shortcut={{ modifiers: ["cmd"], key: "e" }} />
  ) : null;

  return (
    <SharedActionPanel
      path={entry.path}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      symlinkAction={symlinkAction}
      editAction={editAction}
      onTrashItems={onTrashItems}
      revalidate={revalidate}
    />
  );
};
