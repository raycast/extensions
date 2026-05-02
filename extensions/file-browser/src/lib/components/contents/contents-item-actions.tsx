import { Action, Icon, type Keyboard } from "@raycast/api";
import { SharedActionPanel } from "../shared/action-panel";
import type { ContentsItemActionPanelProps } from "./types";

const DETAIL_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "enter" };
const OPEN_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "opt"], key: "o" };

export const ContentsItemActionPanel = ({
  type,
  path,
  siblingDirectories,
  target,
  symlinkDirectoryTarget,
  detail,
  edit,
  enterAction,
  onCreateFolder,
  onMoveItem,
  onCopyItem,
  onTrashItems,
  revalidate,
}: ContentsItemActionPanelProps) => {
  const isNavigableDir = target != null;
  const showDetailFirst = !isNavigableDir && enterAction === "detail";

  const openAction = isNavigableDir ? (
    <Action.Push
      target={target}
      title="Open"
      icon={Icon.Folder}
      shortcut={showDetailFirst ? OPEN_SHORTCUT : undefined}
      onPop={() => revalidate?.()}
    />
  ) : (
    <Action.Open
      title="Open"
      target={path}
      icon={Icon.ArrowRightCircle}
      shortcut={showDetailFirst ? OPEN_SHORTCUT : undefined}
    />
  );

  const symlinkAction = symlinkDirectoryTarget ? (
    <Action.Push
      title="Open Target in Browser"
      icon={Icon.Folder}
      target={symlinkDirectoryTarget}
      shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
      onPop={() => revalidate?.()}
    />
  ) : null;

  const detailAction = detail ? (
    <Action.Push
      target={detail}
      title="Open Detail"
      icon={Icon.AppWindow}
      shortcut={showDetailFirst || isNavigableDir ? DETAIL_SHORTCUT : undefined}
      onPop={() => revalidate?.()}
    />
  ) : null;

  const editAction = edit ? (
    <Action.Push
      target={edit}
      title="Edit"
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      onPop={() => revalidate?.()}
    />
  ) : null;

  return (
    <SharedActionPanel
      path={path}
      sourceType={type}
      siblingDirectories={siblingDirectories}
      primaryAction={showDetailFirst ? detailAction : openAction}
      secondaryAction={showDetailFirst ? openAction : detailAction}
      symlinkAction={symlinkAction}
      editAction={editAction}
      onCreateFolder={onCreateFolder}
      onMoveItem={onMoveItem}
      onCopyItem={onCopyItem}
      onTrashItems={onTrashItems}
      revalidate={revalidate}
    />
  );
};
