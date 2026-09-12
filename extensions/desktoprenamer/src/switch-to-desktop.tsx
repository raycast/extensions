import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { runDesktopRenamerCommand, escapeAppleScriptString } from "./utils";
import { isMoveTarget, useSpaces, Space, RenameSpaceForm } from "./spaces";

export default function Command() {
  const { spaces, groupedSpaces, currentId, isLoading, revalidate } = useSpaces();
  const currentIds = currentId ? currentId.split(",").map((s) => s.trim()) : [];
  const currentSpace = spaces.find((s) => currentIds.includes(s.id));

  async function switchSpace(space: Space) {
    try {
      const sanitizedId = escapeAppleScriptString(space.id);
      await runDesktopRenamerCommand(`switch to space "${sanitizedId}"`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await revalidate();
    } catch {
      // Handled by utils
    }
  }

  async function moveWindow(space: Space) {
    try {
      const sanitizedId = escapeAppleScriptString(space.id);
      const isCurrentFullscreen = currentSpace?.isFullscreen;

      if (isCurrentFullscreen) {
        await showToast({ style: Toast.Style.Animated, title: "Un-fullscreening and moving window..." });
      }

      await runDesktopRenamerCommand(`move window to space "${sanitizedId}"`);

      if (isCurrentFullscreen) {
        await new Promise((resolve) => setTimeout(resolve, 1700));
      }

      await showToast({ style: Toast.Style.Success, title: `Moved window to ${space.name}` });
      await revalidate();
    } catch {
      // Handled by utils
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search desktops...">
      {Object.entries(groupedSpaces).map(([displayID, spaces]) => (
        <List.Section key={displayID} title={displayID}>
          {spaces.map((space) => {
            const isCurrent = currentIds.includes(space.id);
            return (
              <List.Item
                key={space.id}
                title={space.name}
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
                    {space.isFullscreen !== true && (
                      <Action.Push
                        title="Rename Space"
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        icon={Icon.Pencil}
                        target={<RenameSpaceForm space={space} onRename={revalidate} />}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
