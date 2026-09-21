import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import {
  switchToSpace,
  moveWindowToSpace,
  rearrangeSpace as rearrangeDesktopSpace,
  toggleLockSpace,
  restoreMovedWindows,
} from "./utils";
import { isMoveTarget, useSpaces, Space, RenameSpaceForm } from "./spaces";

export default function Command() {
  const { spaces, displayGroups, hasMultipleDisplays, currentId, movedWindowsCount, isLoading, revalidate } =
    useSpaces();
  const currentIds = currentId ? currentId.split(",").map((s) => s.trim()) : [];
  const currentSpace = spaces.find((s) => currentIds.includes(s.id));
  const [rearrangingSpaceID, setRearrangingSpaceID] = useState<string | null>(null);

  async function switchSpace(space: Space) {
    try {
      await switchToSpace(space.id);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await revalidate();
    } catch {
      // Handled by utils
    }
  }

  async function toggleSpaceLock(space: Space) {
    try {
      await toggleLockSpace(space.id);
      await showToast({ style: Toast.Style.Success, title: space.isLocked ? "Space unlocked" : "Space locked" });
      await revalidate();
    } catch {
      // Handled by utils
    }
  }

  async function restoreLockedWindows() {
    try {
      await restoreMovedWindows();
      await showToast({ style: Toast.Style.Success, title: "Restoring windows moved by Space Lock" });
      await revalidate();
    } catch {
      // Handled by utils
    }
  }

  async function moveWindow(space: Space) {
    try {
      const isCurrentFullscreen = currentSpace?.isFullscreen;

      if (isCurrentFullscreen) {
        await showToast({ style: Toast.Style.Animated, title: "Un-fullscreening and moving window..." });
      }

      await moveWindowToSpace(space.id);

      if (isCurrentFullscreen !== false) {
        await new Promise((resolve) => setTimeout(resolve, 1700));
      }

      await showToast({ style: Toast.Style.Success, title: `Moved window to ${space.name}` });
      await revalidate();
    } catch {
      // Handled by utils
    }
  }

  async function rearrangeSpace(space: Space, direction: "up" | "down") {
    if (rearrangingSpaceID !== null) return;
    setRearrangingSpaceID(space.id);
    try {
      await rearrangeDesktopSpace(space.id, direction);
      await new Promise((resolve) => setTimeout(resolve, 700));
      await showToast({
        style: Toast.Style.Success,
        title: `${space.name} moved ${direction}`,
      });
      await revalidate();
    } catch {
      // Handled by utils
    } finally {
      setRearrangingSpaceID(null);
    }
  }

  function renderSpace(space: Space) {
    const isCurrent = currentIds.includes(space.id);
    const isLocked = space.isFullscreen === false && space.isLocked;
    const title = isLocked ? `${space.name} 🔒` : space.name;
    return (
      <List.Item
        key={space.id}
        title={title}
        subtitle={`Space ${space.num}`}
        icon={
          space.isFullscreen && space.appPath
            ? { fileIcon: space.appPath }
            : { source: Icon.Desktop, tintColor: isCurrent ? Color.Blue : undefined }
        }
        accessories={isCurrent ? [{ tag: { value: "Current", color: Color.Blue } }] : []}
        actions={
          <ActionPanel>
            <Action title="Switch to Desktop" icon={Icon.Desktop} onAction={() => switchSpace(space)} />
            {isMoveTarget(space) && (
              <Action
                title="Move Window to Desktop"
                icon={Icon.Window}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={() => moveWindow(space)}
              />
            )}
            {space.isFullscreen === false && (
              <ActionPanel.Section>
                <Action
                  title={isLocked ? "Unlock Space" : "Lock Space"}
                  icon={isLocked ? Icon.LockUnlocked : Icon.Lock}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                  onAction={() => toggleSpaceLock(space)}
                />
                <Action
                  title={`Restore Moved Windows (${movedWindowsCount})`}
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "z" }}
                  onAction={restoreLockedWindows}
                />
              </ActionPanel.Section>
            )}
            {space.isFullscreen === false && (
              <ActionPanel.Section>
                <Action.Push
                  title="Rename Space"
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  icon={Icon.Pencil}
                  target={<RenameSpaceForm space={space} onRename={revalidate} />}
                />
                <Action
                  title="Move Space up"
                  icon={Icon.ArrowUp}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                  onAction={() => rearrangeSpace(space, "up")}
                />
                <Action
                  title="Move Space Down"
                  icon={Icon.ArrowDown}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                  onAction={() => rearrangeSpace(space, "down")}
                />
              </ActionPanel.Section>
            )}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading || rearrangingSpaceID !== null} searchBarPlaceholder="Search desktops...">
      {hasMultipleDisplays
        ? displayGroups.map((group) => (
            <List.Section key={group.displayID} title={group.displayName}>
              {group.items.map(renderSpace)}
            </List.Section>
          ))
        : spaces.map(renderSpace)}
    </List>
  );
}
