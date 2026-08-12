import { List, ActionPanel, Action, Icon, showToast, Toast, popToRoot, Color, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  runDesktopRenamerCommand,
  runDesktopRenamerScript,
  escapeAppleScriptString,
  moveSpecificWindowToSpace,
} from "./utils";
import { isMoveTarget } from "./spaces";

interface SpaceGroup {
  id: string;
  name: string;
  displayID: string;
  num: number;
  isFullscreen: boolean | undefined;
}

interface WindowEntry {
  windowID: number;
  pid: number;
  ownerName: string;
  appPath: string;
  title: string;
  space: SpaceGroup;
  isMinimized: boolean | undefined;
  isHidden: boolean | undefined;
}

function parseWindowData(raw: string): { spaces: SpaceGroup[]; windows: WindowEntry[] } {
  const spaces: SpaceGroup[] = [];
  const windows: WindowEntry[] = [];
  let currentSpace: SpaceGroup | null = null;

  for (const line of raw.split("\n")) {
    if (line.startsWith(">")) {
      const parts = line.slice(1).split("~");
      currentSpace = {
        id: parts[0],
        name: parts[1] || "Unknown",
        displayID: parts[2] || "Display",
        num: parseInt(parts[3] || "0", 10),
        // parts[4] (isFullscreen) is only present in the 5-field format.
        // When absent (legacy 4-field format), leave undefined as unknown.
        isFullscreen: parts.length >= 5 ? parts[4] === "1" : undefined,
      };
      spaces.push(currentSpace);
    } else if (line.startsWith("  ") && currentSpace) {
      const parts = line.trim().split("|");
      if (parts.length >= 7) {
        // New format: wid|pid|owner|appPath|title|isMinimized|isHidden
        windows.push({
          windowID: parseInt(parts[0], 10),
          pid: parseInt(parts[1], 10),
          ownerName: parts[2],
          appPath: parts[3],
          title: parts.slice(4, parts.length - 2).join("|"),
          isMinimized: parts[parts.length - 2] === "1",
          isHidden: parts[parts.length - 1] === "1",
          space: { ...currentSpace },
        });
      } else if (parts.length >= 5) {
        // Legacy format: wid|pid|owner|appPath|title (no state fields).
        // Leave state undefined so the UI only shows state-dependent
        // actions and badges when the value is confirmed.
        windows.push({
          windowID: parseInt(parts[0], 10),
          pid: parseInt(parts[1], 10),
          ownerName: parts[2],
          appPath: parts[3],
          title: parts.slice(4).join("|"),
          isMinimized: undefined,
          isHidden: undefined,
          space: { ...currentSpace },
        });
      }
    }
  }
  return { spaces, windows };
}

export default function Command() {
  const [filterSpaceId, setFilterSpaceId] = useState("all");

  const { data, isLoading, revalidate } = usePromise(async () => {
    const result = await runDesktopRenamerScript(`
      tell application "DesktopRenamer"
        get windows
      end tell
    `);
    return parseWindowData(result);
  });

  const allSpaces = data?.spaces ?? [];
  const allWindows = data?.windows ?? [];

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
      await runDesktopRenamerCommand(`focus window ${entry.windowID} pid ${entry.pid}`);
      await showToast({ style: Toast.Style.Success, title: `Switched to ${entry.title}` });
      await popToRoot();
    } catch {
      // Error handled by utils
    }
  }

  async function moveToCurrentDesktop(entry: WindowEntry) {
    try {
      // Remember where we are now.
      const currentIdsRaw = await runDesktopRenamerCommand("get current space id");
      const currentIds = currentIdsRaw.split(",").map((s: string) => s.trim());
      if (!currentIds[0]) {
        await showToast({ style: Toast.Style.Failure, title: "Could not determine current desktop" });
        return;
      }
      const targetId = currentIds[0];
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
      });
      await delay(entry.space.isFullscreen === false ? 600 : 1750); // Wait for the backend's drag operation to complete
      // Switch back to the original (current) desktop.
      await runDesktopRenamerCommand(`switch to space "${escapeAppleScriptString(targetId)}"`);
      await showToast({
        style: Toast.Style.Success,
        title: `Moved "${entry.title}" to current desktop`,
      });
      revalidate();
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
      let originalSpaceId: string | null = null;
      if (prefs.returnToOriginalSpace) {
        const currentIdsRaw = await runDesktopRenamerCommand("get current space id");
        const currentIds = currentIdsRaw.split(",").map((s: string) => s.trim());
        if (currentIds[0]) {
          originalSpaceId = currentIds[0];
        }
      }

      await moveSpecificWindowToSpace({
        windowID: entry.windowID,
        pid: entry.pid,
        fromSpaceID: entry.space.id,
        targetSpaceID: targetSpace.id,
      });

      if (originalSpaceId && originalSpaceId !== targetSpace.id) {
        await delay(entry.space.isFullscreen === false ? 600 : 1750); // Wait for the backend's drag operation to complete
        await runDesktopRenamerCommand(`switch to space "${escapeAppleScriptString(originalSpaceId)}"`);
      } else if (entry.space.isFullscreen !== false) {
        await delay(1200); // Wait for un-fullscreen transition
      }
      await showToast({
        style: Toast.Style.Success,
        title: `Moved "${entry.title}" to ${targetSpace.name}`,
      });
      revalidate();
    } catch {
      // Error handled by utils
    }
  }

  async function handleWindowAction(entry: WindowEntry, action: string) {
    try {
      const toast = await showToast({ style: Toast.Style.Animated, title: `Executing action: ${action}...` });
      await runDesktopRenamerCommand(`execute window action "${entry.windowID}" pid "${entry.pid}" action "${action}"`);
      toast.style = Toast.Style.Success;
      toast.title = `Executed ${action}`;
      revalidate();
    } catch {
      // Error handled by utils
    }
  }

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  return (
    <List
      isLoading={isLoading}
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
            <List.Section key={space.id} title={space.name} subtitle={`${space.displayID} · Space ${space.num}`}>
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
                          {allSpaces
                            .filter((s) => s.id !== entry.space.id && isMoveTarget(s))
                            .map((targetSpace) => (
                              <Action
                                key={targetSpace.id}
                                title={targetSpace.name}
                                onAction={() => moveToDesktop(entry, targetSpace)}
                              />
                            ))}
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
