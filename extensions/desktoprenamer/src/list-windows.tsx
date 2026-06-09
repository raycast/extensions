import { List, ActionPanel, Action, Icon, showToast, Toast, popToRoot, Color, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { runDesktopRenamerCommand, runDesktopRenamerScript, escapeAppleScriptString } from "./utils";

interface SpaceGroup {
  id: string;
  name: string;
  displayID: string;
  num: number;
}

interface WindowEntry {
  windowID: number;
  pid: number;
  ownerName: string;
  appPath: string;
  title: string;
  space: SpaceGroup;
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
      };
      spaces.push(currentSpace);
    } else if (line.startsWith("  ") && currentSpace) {
      const parts = line.trim().split("|");
      if (parts.length >= 5) {
        windows.push({
          windowID: parseInt(parts[0], 10),
          pid: parseInt(parts[1], 10),
          ownerName: parts[2],
          appPath: parts[3],
          title: parts.slice(4).join("|"),
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
      if (targetId === entry.space.id) {
        await showToast({ style: Toast.Style.Success, title: "Window is already on current desktop" });
        return;
      }

      // Focus the window (this naturally switches to its space)
      await runDesktopRenamerCommand(`focus window ${entry.windowID} pid ${entry.pid}`);
      await delay(450); // Wait for the natural space switch animation
      // Move via DesktopRenamer's backend
      await runDesktopRenamerCommand(`move window to space "${escapeAppleScriptString(targetId)}"`);
      await delay(600); // Wait for the backend's drag operation to complete
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

      // Focus the window (this naturally switches to its space)
      await runDesktopRenamerCommand(`focus window ${entry.windowID} pid ${entry.pid}`);
      await delay(450); // Wait for the natural space switch animation
      // Move via DesktopRenamer's backend
      await runDesktopRenamerCommand(`move window to space "${escapeAppleScriptString(targetSpace.id)}"`);

      if (originalSpaceId && originalSpaceId !== targetSpace.id) {
        await delay(600); // Wait for the backend's drag operation to complete
        await runDesktopRenamerCommand(`switch to space "${escapeAppleScriptString(originalSpaceId)}"`);
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
      {visibleSpaces.map((space) => {
        const windows = windowsBySpace.get(space.id) ?? [];
        return (
          <List.Section key={space.id} title={space.name} subtitle={`${space.displayID} · Space ${space.num}`}>
            {windows.length === 0 ? (
              <List.Item key={`empty-${space.id}`} title="No windows" icon={Icon.Minus} />
            ) : (
              windows.map((entry) => (
                <List.Item
                  key={`${entry.windowID}`}
                  title={entry.title}
                  subtitle={entry.ownerName}
                  icon={entry.appPath ? { fileIcon: entry.appPath } : Icon.Window}
                  accessories={[{ tag: { value: entry.space.name, color: Color.SecondaryText } }]}
                  actions={
                    <ActionPanel>
                      <Action title="Switch to Window" icon={Icon.Window} onAction={() => switchToWindow(entry)} />
                      <ActionPanel.Section title="Move Window">
                        <Action
                          title="Move to Current Desktop"
                          icon={Icon.ArrowRight}
                          shortcut={{ modifiers: ["cmd"], key: "m" }}
                          onAction={() => moveToCurrentDesktop(entry)}
                        />
                        <ActionPanel.Submenu
                          title="Move to Desktop…"
                          icon={Icon.List}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                        >
                          {allSpaces
                            .filter((s) => s.id !== entry.space.id)
                            .map((targetSpace) => (
                              <Action
                                key={targetSpace.id}
                                title={targetSpace.name}
                                onAction={() => moveToDesktop(entry, targetSpace)}
                              />
                            ))}
                        </ActionPanel.Submenu>
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))
            )}
          </List.Section>
        );
      })}
    </List>
  );
}
