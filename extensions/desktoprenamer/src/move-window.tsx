import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { runDesktopRenamerCommand, escapeAppleScriptString } from "./utils";
import { isMoveTarget, useSpaces, Space, RenameSpaceForm } from "./spaces";

export default function Command() {
  const { spaces, groupedSpaces, currentId, isLoading, revalidate } = useSpaces();
  const currentSpaceId = currentId ? currentId.split(",")[0]?.trim() : null;
  const currentSpace = currentSpaceId ? spaces.find((s) => s.id === currentSpaceId) : undefined;

  async function moveWindow(space: Space) {
    try {
      const sanitizedId = escapeAppleScriptString(space.id);
      const isCurrentFullscreen = currentSpace?.isFullscreen;

      if (isCurrentFullscreen) {
        await showToast({ style: Toast.Style.Animated, title: "Un-fullscreening and moving window..." });
      }

      await runDesktopRenamerCommand(`move window to space "${sanitizedId}"`);

      if (isCurrentFullscreen === true) {
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
      {Object.entries(groupedSpaces).map(([displayID, spaces]) => {
        const filtered = spaces.filter((s) => s.id !== currentSpaceId && isMoveTarget(s));
        if (filtered.length === 0) return null;
        return (
          <List.Section key={displayID} title={displayID}>
            {filtered.map((space) => {
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
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
