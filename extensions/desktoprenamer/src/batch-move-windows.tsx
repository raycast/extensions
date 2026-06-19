import { List, ActionPanel, Action, showToast, Toast, popToRoot, Icon, Color, getPreferenceValues } from "@raycast/api";
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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function Command() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [stagedMoves, setStagedMoves] = useState<Map<number, { window: WindowEntry; targetSpace: SpaceGroup }>>(
    new Map(),
  );

  const { data, isLoading } = usePromise(async () => {
    const result = await runDesktopRenamerScript(`
      tell application "DesktopRenamer"
        get windows
      end tell
    `);
    return parseWindowData(result);
  });

  const spaces = data?.spaces ?? [];
  const allWindows = data?.windows ?? [];

  // Separate windows into staged and unstaged
  const unstagedWindows = allWindows.filter((w) => !stagedMoves.has(w.windowID));
  const stagedWindowsArray = Array.from(stagedMoves.values());

  const windowsBySpace = new Map<string, WindowEntry[]>();
  for (const w of unstagedWindows) {
    const list = windowsBySpace.get(w.space.id) ?? [];
    list.push(w);
    windowsBySpace.set(w.space.id, list);
  }

  function stageMove(window: WindowEntry, targetSpace: SpaceGroup) {
    const newStaged = new Map(stagedMoves);
    newStaged.set(window.windowID, { window, targetSpace });
    setStagedMoves(newStaged);
  }

  function unstageMove(windowID: number) {
    const newStaged = new Map(stagedMoves);
    newStaged.delete(windowID);
    setStagedMoves(newStaged);
  }

  async function executeBatchMove() {
    if (stagedMoves.size === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No moves staged" });
      return;
    }

    setIsExecuting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Executing batch move..." });

    try {
      const prefs = getPreferenceValues<Preferences>();
      let originalSpaceId: string | null = null;
      if (prefs.returnToOriginalSpace) {
        const currentIdsRaw = await runDesktopRenamerCommand("get current space id");
        const currentIds = currentIdsRaw.split(",").map((s: string) => s.trim());
        if (currentIds[0]) {
          originalSpaceId = currentIds[0];
        }
      }

      // Group moves by the window's SOURCE space to minimize space switching.
      // E.g., we go to Space A, move all targeted windows out, then go to Space B, etc.
      const movesBySource = new Map<string, typeof stagedWindowsArray>();
      for (const move of stagedWindowsArray) {
        const list = movesBySource.get(move.window.space.id) ?? [];
        list.push(move);
        movesBySource.set(move.window.space.id, list);
      }

      let totalMoved = 0;
      for (const [sourceId, sourceMoves] of movesBySource.entries()) {
        toast.message = `Processing ${sourceMoves[0].window.space.name}...`;

        // Switch to the source space once for all its windows
        await runDesktopRenamerCommand(`switch to space "${escapeAppleScriptString(sourceId)}"`);
        await delay(600); // Give Mission Control time to settle

        for (const move of sourceMoves) {
          toast.message = `Moving ${move.window.title}...`;

          // Focus the specific window (making it the active window in this space)
          await runDesktopRenamerCommand(`focus window ${move.window.windowID} pid ${move.window.pid}`);
          await delay(250);

          // Execute the backend move operation on the active window
          await runDesktopRenamerCommand(`move window to space "${escapeAppleScriptString(move.targetSpace.id)}"`);
          await delay(500); // Wait for the backend drag action
          totalMoved++;

          // Since move window to space switches the system to the target space,
          // we must switch BACK to our current source space to process the next window in this group.
          if (sourceMoves.indexOf(move) < sourceMoves.length - 1) {
            await runDesktopRenamerCommand(`switch to space "${escapeAppleScriptString(sourceId)}"`);
            await delay(600);
          }
        }
      }

      // Finally, return to the desktop where the user started the command
      if (originalSpaceId && prefs.returnToOriginalSpace) {
        toast.message = "Returning to original desktop...";
        await runDesktopRenamerCommand(`switch to space "${escapeAppleScriptString(originalSpaceId)}"`);
        await delay(400);
      }

      toast.style = Toast.Style.Success;
      toast.title = `Successfully moved ${totalMoved} window${totalMoved === 1 ? "" : "s"}`;
      await popToRoot();
    } catch {
      await toast.hide();
      setIsExecuting(false);
    }
  }

  const ExecuteAction = () => (
    <Action
      title="Confirm & Execute Batch Move"
      icon={Icon.Checkmark}
      shortcut={{ modifiers: ["cmd"], key: "return" }}
      onAction={executeBatchMove}
    />
  );

  return (
    <List isLoading={isLoading || isExecuting} searchBarPlaceholder="Search windows...">
      {stagedWindowsArray.length > 0 && (
        <List.Section title="Staged Moves (Pending)" subtitle={`${stagedWindowsArray.length} items`}>
          {stagedWindowsArray.map((move) => (
            <List.Item
              key={`staged_${move.window.windowID}`}
              title={move.window.title}
              subtitle={move.window.ownerName}
              icon={move.window.appPath ? { fileIcon: move.window.appPath } : Icon.Window}
              accessories={[{ tag: { value: `→ ${move.targetSpace.name}`, color: Color.Green } }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Unstage Move"
                    icon={Icon.XMarkCircle}
                    onAction={() => unstageMove(move.window.windowID)}
                  />
                  <ExecuteAction />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {spaces.map((space) => {
        const spaceWindows = windowsBySpace.get(space.id) ?? [];
        if (spaceWindows.length === 0) return null;

        return (
          <List.Section key={space.id} title={space.name} subtitle={`${spaceWindows.length} windows`}>
            {spaceWindows.map((win) => (
              <List.Item
                key={`win_${win.windowID}`}
                title={win.title}
                subtitle={win.ownerName}
                icon={win.appPath ? { fileIcon: win.appPath } : Icon.Window}
                accessories={[{ tag: { value: win.space.name, color: Color.SecondaryText } }]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Submenu title="Stage Move to Desktop…" icon={Icon.ArrowRight}>
                      {spaces
                        .filter((s) => s.id !== space.id)
                        .map((targetSpace) => (
                          <Action
                            key={targetSpace.id}
                            title={targetSpace.name}
                            icon={Icon.Desktop}
                            onAction={() => stageMove(win, targetSpace)}
                          />
                        ))}
                    </ActionPanel.Submenu>
                    {stagedWindowsArray.length > 0 && <ExecuteAction />}
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
