import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { runDesktopRenamerCommand, runDesktopRenamerScript, escapeAppleScriptString } from "./utils";

export interface Space {
  id: string;
  name: string;
  displayID: string;
  num: number;
  isFullscreen: boolean | undefined;
  appPath?: string;
}

export function isMoveTarget(space: Pick<Space, "isFullscreen">) {
  return space.isFullscreen === false;
}

export function useSpaces() {
  const { data, isLoading, revalidate } = usePromise<() => Promise<string | null>>(async () => {
    try {
      return await runDesktopRenamerScript(`
        tell application "DesktopRenamer"
          set allSpaces to get all spaces
          set currentName to get current space name
          set currentId to get current space id
          return allSpaces & "~~~" & currentName & "~~~" & currentId
        end tell
      `);
    } catch {
      return null;
    }
  });

  let spaces: Space[] = [];
  let currentName = "";
  let currentId = "";

  if (data) {
    const [spacesStr, curName, curId] = data.split("~~~");
    currentName = curName ? curName.trim() : "";
    currentId = curId ? curId.trim() : "";
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
          // parts[4] (isFullscreen) is only present in the 5-field format.
          // When absent (legacy 4-field format), leave undefined as unknown.
          isFullscreen: parts.length >= 5 ? parts[4] === "1" : undefined,
          appPath: parts[5] || undefined,
        };
      });
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

  return {
    spaces,
    currentName,
    currentId,
    groupedSpaces,
    isLoading,
    revalidate,
  };
}

export function RenameSpaceForm({ space, onRename }: { space: Space; onRename: () => void }) {
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
