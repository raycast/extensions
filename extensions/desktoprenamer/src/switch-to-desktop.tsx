import { List, ActionPanel, Action, Icon, Color, showToast, Toast, Form, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { runDesktopRenamerCommand, escapeAppleScriptString, runDesktopRenamerScript } from "./utils";

interface Space {
  id: string;
  name: string;
  displayID: string;
  num: number;
}

export default function Command() {
  const { data, isLoading, revalidate } = usePromise<() => Promise<string | null>>(async () => {
    try {
      return await runDesktopRenamerScript(`
        tell application "DesktopRenamer"
          set allSpaces to get all spaces
          set currentName to get current space name
          return allSpaces & "~~~" & currentName
        end tell
      `);
    } catch {
      return null;
    }
  });

  let spaces: Space[] = [];
  let currentName = "";

  if (data) {
    const [spacesStr, curName] = data.split("~~~");
    currentName = curName ? curName.trim() : "";
    spaces = spacesStr
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const parts = line.split("~");
        return {
          id: parts[0],
          name: parts[1] || "Unknown",
          displayID: parts[2] || "Main",
          num: parseInt(parts[3] || "0", 10),
        };
      });
  }

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

  const groupedSpaces =
    spaces.reduce(
      (acc, space) => {
        const group = acc[space.displayID] || [];
        group.push(space);
        acc[space.displayID] = group;
        return acc;
      },
      {} as Record<string, Space[]>,
    ) || {};

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
                  source: Icon.Desktop,
                  tintColor: isCurrent ? Color.Blue : undefined,
                }}
                accessories={isCurrent ? [{ tag: { value: "Current", color: Color.Blue } }] : []}
                actions={
                  <ActionPanel>
                    <Action title="Switch to Desktop" icon={Icon.Desktop} onAction={() => switchSpace(space)} />
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

function RenameSpaceForm({ space, onRename }: { space: Space; onRename: () => void }) {
  const { pop } = useNavigation();

  async function handleRename(values: { name: string }) {
    try {
      const sanitizedName = escapeAppleScriptString(values.name).replace(/~/g, "");
      const sanitizedId = escapeAppleScriptString(space.id);
      await runDesktopRenamerCommand(`rename space "${sanitizedId}" to "${sanitizedName}"`);
      await showToast({ style: Toast.Style.Success, title: "Renamed space" });
      onRename();
      pop();
    } catch {
      // Handled
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" onSubmit={handleRename} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="New Name" defaultValue={space.name} placeholder="Enter new name" />
    </Form>
  );
}
