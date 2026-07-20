import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { runDesktopRenamerCommand, escapeAppleScriptString } from "./utils";
import { useSpaces, Space, RenameSpaceForm } from "./spaces";

export default function Command() {
  const { groupedSpaces, currentName, isLoading, revalidate } = useSpaces();

  async function moveWindow(space: Space) {
    try {
      const sanitizedId = escapeAppleScriptString(space.id);
      await runDesktopRenamerCommand(`move window to space "${sanitizedId}"`);
      await showToast({ style: Toast.Style.Success, title: `Moved window to ${space.name}` });
    } catch {
      // Handled by utils
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search desktops...">
      {Object.entries(groupedSpaces).map(([displayID, spaces]) => (
        <List.Section key={displayID} title={displayID}>
          {spaces.map((space) => {
            const isCurrent = space.name === currentName;
            return (
              <List.Item
                key={space.id}
                title={space.name}
                subtitle={`Space ${space.num}`}
                icon={{
                  source: Icon.Window,
                  tintColor: isCurrent ? Color.Blue : undefined,
                }}
                accessories={isCurrent ? [{ tag: { value: "Current", color: Color.Blue } }] : []}
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
      ))}
    </List>
  );
}
