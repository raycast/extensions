import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getSpaceSnapshot, renameSpace, SpaceAPISnapshot } from "./utils";

export interface Space {
  id: string;
  name: string;
  displayID: string;
  displayName: string;
  num: number;
  isFullscreen: boolean | undefined;
  appPath?: string;
  isLocked: boolean;
}

export interface DisplayGroup<T> {
  displayID: string;
  displayName: string;
  items: T[];
}

export function isMoveTarget(space: Pick<Space, "isFullscreen">) {
  return space.isFullscreen === false;
}

export function groupByDisplay<T extends Pick<Space, "displayID" | "displayName">>(items: T[]): DisplayGroup<T>[] {
  const groups = new Map<string, DisplayGroup<T>>();

  for (const item of items) {
    const group = groups.get(item.displayID) ?? {
      displayID: item.displayID,
      displayName: item.displayName,
      items: [],
    };
    group.items.push(item);
    groups.set(item.displayID, group);
  }

  return Array.from(groups.values());
}

export function hasMultipleDisplays<T extends Pick<Space, "displayID">>(items: T[]): boolean {
  return new Set(items.map((item) => item.displayID)).size > 1;
}

export function useSpaces() {
  const { data, isLoading, revalidate } = usePromise<() => Promise<SpaceAPISnapshot | null>>(async () => {
    try {
      return await getSpaceSnapshot();
    } catch {
      return null;
    }
  });

  let spaces: Space[] = [];
  let currentName = "";
  let currentId = "";
  let activeSpaceID = "";
  let movedWindowsCount = 0;

  if (data) {
    const snapshot: SpaceAPISnapshot = data;
    currentName = snapshot.currentSpaceName;
    currentId = snapshot.currentSpaceIDs.join(",");
    activeSpaceID = snapshot.currentSpaceID ?? snapshot.currentSpaceIDs[0] ?? "";
    movedWindowsCount = snapshot.movedWindowsCount;
    spaces = snapshot.spaces.map((space) => ({
      id: space.id,
      name: space.name || "Unknown",
      displayID: space.displayID || "Main",
      displayName: space.displayName || space.displayID || "Main",
      num: space.number,
      isFullscreen: space.isFullscreen,
      appPath: space.appPath ?? undefined,
      isLocked: space.isLocked,
    }));
  }

  const displayGroups = groupByDisplay(spaces);

  return {
    spaces,
    currentName,
    currentId,
    activeSpaceID,
    displayGroups,
    hasMultipleDisplays: hasMultipleDisplays(spaces),
    movedWindowsCount,
    isLoading,
    revalidate,
  };
}

export function RenameSpaceForm({ space, onRename }: { space: Space; onRename: () => void }) {
  const { pop } = useNavigation();

  async function handleRename(values: { name: string }) {
    try {
      await renameSpace(space.id, values.name, "Failed to rename space");
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
