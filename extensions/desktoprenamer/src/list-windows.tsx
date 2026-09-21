import { List, ActionPanel, Action, Icon, showToast, Toast, popToRoot, Color, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  moveSpecificWindowToSpace,
  getCurrentSpacesByDisplay,
  restoreSpacesByDisplay,
  focusWindowOnSpace,
  executeWindowAction,
  SpaceAPIWindowAction,
  getWindowsSnapshot,
  mapWindowsSnapshot,
  SpaceAPIWindowEntry,
  SpaceAPIWindowSpaceRecord,
  getWindowActionLabel,
} from "./utils";
import { groupByDisplay, hasMultipleDisplays, isMoveTarget } from "./spaces";

type SpaceGroup = SpaceAPIWindowSpaceRecord;
type WindowEntry = SpaceAPIWindowEntry;

export default function Command() {
  const [filterSpaceId, setFilterSpaceId] = useState("all");
  const [terminatingPIDs, setTerminatingPIDs] = useState<Set<number>>(new Set());

  const { data, isLoading, revalidate } = usePromise(async () => {
    return mapWindowsSnapshot(await getWindowsSnapshot());
  });
  const {
    data: currentSpaces,
    isLoading: isLoadingCurrentSpaces,
    revalidate: revalidateCurrentSpaces,
  } = usePromise(async () => {
    try {
      return await getCurrentSpacesByDisplay();
    } catch {
      return { spacesByDisplay: {} };
    }
  });
  const allSpaces = data?.spaces ?? [];
  const rawWindows = data?.windows ?? [];
  const allWindows = rawWindows.filter((window) => !terminatingPIDs.has(window.pid));
  const currentSpaceIDs = new Set(Object.values(currentSpaces?.spacesByDisplay ?? {}));
  const showDisplaySections = hasMultipleDisplays(allSpaces);

  useEffect(() => {
    if (!data) return;

    setTerminatingPIDs((previous) => {
      const next = new Set(Array.from(previous).filter((pid) => rawWindows.some((window) => window.pid === pid)));
      return next.size === previous.size ? previous : next;
    });
  }, [data, rawWindows]);

  // Apply filter
  const filteredWindows = filterSpaceId === "all" ? allWindows : allWindows.filter((w) => w.space.id === filterSpaceId);

  // Group windows by space ID, preserving space order.
  const windowsBySpace = new Map<string, WindowEntry[]>();
  for (const w of filteredWindows) {
    const list = windowsBySpace.get(w.space.id) ?? [];
    list.push(w);
    windowsBySpace.set(w.space.id, list);
  }

  // Determine which spaces to show (filtered or all).
  const visibleSpaces = filterSpaceId === "all" ? allSpaces : allSpaces.filter((s) => s.id === filterSpaceId);

  async function switchToWindow(entry: WindowEntry) {
    try {
      await focusWindowOnSpace(entry.windowID, entry.pid, entry.space.id);
      await showToast({ style: Toast.Style.Success, title: `Switched to ${entry.title}` });
      await popToRoot();
    } catch {
      // Error handled by utils
    }
  }

  async function moveToCurrentDesktop(entry: WindowEntry) {
    try {
      const prefs = getPreferenceValues<Preferences>();
      const originalSpaces = await getCurrentSpacesByDisplay();
      const targetId = originalSpaces.spacesByDisplay[entry.space.displayID] ?? "";
      if (!targetId) {
        await showToast({ style: Toast.Style.Failure, title: "Could not determine current desktop" });
        return;
      }
      const targetSpace = allSpaces.find((space) => space.id === targetId);
      if (!targetSpace || !isMoveTarget(targetSpace)) {
        await showToast({ style: Toast.Style.Failure, title: "Current space cannot receive moved windows" });
        return;
      }
      if (targetId === entry.space.id) {
        await showToast({ style: Toast.Style.Success, title: "Window is already on current desktop" });
        return;
      }

      await moveSpecificWindowToSpace({
        windowID: entry.windowID,
        pid: entry.pid,
        fromSpaceID: entry.space.id,
        targetSpaceID: targetId,
        isMinimized: entry.isMinimized,
        isHidden: entry.isHidden,
      });
      await delay(entry.space.isFullscreen === false ? 600 : 1750); // Wait for the backend's drag operation to complete
      if (prefs.returnToOriginalSpace) {
        await restoreSpacesByDisplay(originalSpaces);
      }
      await showToast({
        style: Toast.Style.Success,
        title: `Moved "${entry.title}" to current desktop`,
      });
      revalidate();
      revalidateCurrentSpaces();
    } catch {
      // Error handled by utils
    }
  }

  async function moveToDesktop(entry: WindowEntry, targetSpace: SpaceGroup) {
    try {
      if (entry.space.id === targetSpace.id) {
        await showToast({ style: Toast.Style.Success, title: "Window is already on that desktop" });
        return;
      }

      const prefs = getPreferenceValues<Preferences>();
      const originalSpaces = prefs.returnToOriginalSpace ? await getCurrentSpacesByDisplay() : undefined;

      await moveSpecificWindowToSpace({
        windowID: entry.windowID,
        pid: entry.pid,
        fromSpaceID: entry.space.id,
        targetSpaceID: targetSpace.id,
        isMinimized: entry.isMinimized,
        isHidden: entry.isHidden,
      });

      if (originalSpaces) {
        await delay(entry.space.isFullscreen === false ? 600 : 1750); // Wait for the backend's drag operation to complete
        await restoreSpacesByDisplay(originalSpaces);
      } else if (entry.space.isFullscreen !== false) {
        await delay(1200); // Wait for un-fullscreen transition
      }
      await showToast({
        style: Toast.Style.Success,
        title: `Moved "${entry.title}" to ${targetSpace.name}`,
      });
      revalidate();
      revalidateCurrentSpaces();
    } catch {
      // Error handled by utils
    }
  }

  async function handleWindowAction(entry: WindowEntry, action: SpaceAPIWindowAction) {
    try {
      const prefs = getPreferenceValues<Preferences>();
      const originalSpaces =
        action === "quit" || !prefs.returnToOriginalSpace ? undefined : await getCurrentSpacesByDisplay();
      const actionLabel = getWindowActionLabel(action);
      if (action === "quit") {
        setTerminatingPIDs((previous) => new Set(previous).add(entry.pid));
      }
      const toast = await showToast({ style: Toast.Style.Animated, title: `${actionLabel}...` });
      try {
        await executeWindowAction(entry.windowID, entry.pid, action);
      } finally {
        if (originalSpaces) {
          await restoreSpacesByDisplay(originalSpaces);
        }
      }
      toast.style = Toast.Style.Success;
      toast.title = `${actionLabel} completed`;
      revalidate();
    } catch {
      if (action === "quit") {
        setTerminatingPIDs((previous) => {
          const next = new Set(previous);
          next.delete(entry.pid);
          return next;
        });
      }
      // Error handled by utils
    }
  }

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  return (
    <List
      isLoading={isLoading || isLoadingCurrentSpaces}
      searchBarPlaceholder="Search windows..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Desktop" onChange={setFilterSpaceId} defaultValue="all">
          <List.Dropdown.Item title="All Desktops" value="all" />
          <List.Dropdown.Section title="Desktops">
            {allSpaces.map((space) => (
              <List.Dropdown.Item key={space.id} title={space.name} value={space.id} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {visibleSpaces
        .filter((space) => (windowsBySpace.get(space.id) ?? []).length > 0)
        .map((space) => {
          const windows = windowsBySpace.get(space.id) ?? [];
          return (
            <List.Section
              key={space.id}
              title={showDisplaySections ? `${space.displayName} · ${space.name}` : space.name}
              subtitle={`Space ${space.num}`}
            >
              {windows.map((entry) => (
                <List.Item
                  key={`${entry.windowID}-${entry.pid}`}
                  title={entry.title}
                  subtitle={entry.ownerName}
                  icon={entry.appPath ? { fileIcon: entry.appPath } : Icon.Window}
                  accessories={[
                    ...(entry.isHidden === true ? [{ tag: { value: "Hidden", color: Color.Magenta } }] : []),
                    ...(entry.isHidden !== true && entry.isMinimized === true
                      ? [{ tag: { value: "Minimized", color: Color.Orange } }]
                      : []),
                    ...(entry.space.isFullscreen ? [{ tag: { value: "Full Screen", color: Color.Blue } }] : []),
                  ]}
                  actions={
                    <ActionPanel>
                      <Action title="Switch to Window" icon={Icon.Window} onAction={() => switchToWindow(entry)} />
                      <ActionPanel.Section title="Move Window">
                        <Action
                          title="Move to Current Desktop"
                          icon={Icon.ArrowRight}
                          shortcut={{ modifiers: ["cmd"], key: "t" }}
                          onAction={() => moveToCurrentDesktop(entry)}
                        />
                        <ActionPanel.Submenu
                          title="Move to Desktop…"
                          icon={Icon.List}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                        >
                          {(() => {
                            const moveTargets = allSpaces.filter((s) => s.id !== entry.space.id && isMoveTarget(s));
                            const makeAction = (targetSpace: SpaceGroup) => (
                              <Action
                                key={targetSpace.id}
                                title={targetSpace.name}
                                icon={
                                  currentSpaceIDs.has(targetSpace.id)
                                    ? { source: Icon.Circle, tintColor: Color.Blue }
                                    : Icon.Desktop
                                }
                                onAction={() => moveToDesktop(entry, targetSpace)}
                              />
                            );

                            if (!showDisplaySections) {
                              return moveTargets.map(makeAction);
                            }

                            return groupByDisplay(moveTargets).map((group) => (
                              <ActionPanel.Section key={group.displayID} title={group.displayName}>
                                {group.items.map(makeAction)}
                              </ActionPanel.Section>
                            ));
                          })()}
                        </ActionPanel.Submenu>
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Window Actions">
                        <Action
                          title="Close Window"
                          icon={Icon.XMarkCircle}
                          shortcut={{ modifiers: ["ctrl", "shift"], key: "w" }}
                          onAction={() => handleWindowAction(entry, "close")}
                        />
                        {(entry.isMinimized !== false || entry.isHidden !== false) && (
                          <Action
                            title="Restore Window"
                            icon={Icon.ArrowUp}
                            shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
                            onAction={() => handleWindowAction(entry, "restore")}
                          />
                        )}
                        {entry.isMinimized !== true && (
                          <Action
                            title="Minimize Window"
                            icon={Icon.Minus}
                            shortcut={{ modifiers: ["ctrl", "shift"], key: "m" }}
                            onAction={() => handleWindowAction(entry, "minimize")}
                          />
                        )}
                        {entry.isHidden !== true && (
                          <Action
                            title="Hide Application"
                            icon={Icon.EyeDisabled}
                            shortcut={{ modifiers: ["ctrl", "shift"], key: "h" }}
                            onAction={() => handleWindowAction(entry, "hide")}
                          />
                        )}
                        <Action
                          title={entry.space.isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
                          icon={Icon.Maximize}
                          shortcut={{ modifiers: ["ctrl", "shift"], key: "f" }}
                          onAction={() =>
                            handleWindowAction(entry, entry.space.isFullscreen ? "exitFullScreen" : "enterFullScreen")
                          }
                        />
                        <Action
                          title="Quit Application"
                          icon={Icon.Trash}
                          shortcut={{ modifiers: ["ctrl", "shift"], key: "q" }}
                          onAction={() => handleWindowAction(entry, "quit")}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          );
        })}
    </List>
  );
}
