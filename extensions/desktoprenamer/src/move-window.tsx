import { List, ActionPanel, Action, Icon, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { moveWindowToSpace, getCurrentSpacesByDisplay, restoreSpacesByDisplay } from "./utils";
import { isMoveTarget, useSpaces, Space, RenameSpaceForm } from "./spaces";

export default function Command() {
  const { spaces, displayGroups, hasMultipleDisplays, activeSpaceID, isLoading, revalidate } = useSpaces();
  const currentSpaceId = activeSpaceID || null;
  const currentSpace = currentSpaceId ? spaces.find((s) => s.id === currentSpaceId) : undefined;

  async function moveWindow(space: Space) {
    try {
      const preferences = getPreferenceValues<{ returnToOriginalSpace?: boolean }>();
      const originalSpaces = preferences.returnToOriginalSpace ? await getCurrentSpacesByDisplay() : undefined;
      const isCurrentFullscreen = currentSpace?.isFullscreen;

      if (isCurrentFullscreen) {
        await showToast({ style: Toast.Style.Animated, title: "Un-fullscreening and moving window..." });
      }

      await moveWindowToSpace(space.id);

      if (isCurrentFullscreen === true) {
        await new Promise((resolve) => setTimeout(resolve, 1700));
      }

      if (originalSpaces) {
        await restoreSpacesByDisplay(originalSpaces);
      }

      await showToast({ style: Toast.Style.Success, title: `Moved window to ${space.name}` });
      await revalidate();
    } catch {
      // Handled by utils
    }
  }

  function renderSpace(space: Space) {
    return (
      <List.Item
        key={space.id}
        title={space.name}
        subtitle={`Space ${space.num}`}
        icon={{ source: Icon.Window }}
        actions={
          <ActionPanel>
            <Action title="Move Window" icon={Icon.Window} onAction={() => moveWindow(space)} />
            <Action.Push
              title="Rename Space"
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              icon={Icon.Pencil}
              target={<RenameSpaceForm space={space} onRename={revalidate} />}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search desktops...">
      {hasMultipleDisplays
        ? displayGroups.map((group) => {
            const filtered = group.items.filter((space) => space.id !== currentSpaceId && isMoveTarget(space));
            if (filtered.length === 0) return null;
            return (
              <List.Section key={group.displayID} title={group.displayName}>
                {filtered.map(renderSpace)}
              </List.Section>
            );
          })
        : spaces.filter((space) => space.id !== currentSpaceId && isMoveTarget(space)).map(renderSpace)}
    </List>
  );
}
