import { List, ActionPanel, Action, showToast, Toast, popToRoot, Icon, Color, getPreferenceValues } from "@raycast/api";
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

function actionKey(w: { windowID: number; pid: number }): string {
  return `${w.windowID}-${w.pid}`;
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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface StagedAction {
  window: WindowEntry;
  type: "move" | "close" | "minimize" | "hide" | "enterFullScreen" | "exitFullScreen" | "quit" | "restore";
  targetSpace?: SpaceGroup;
}

function getActionLabel(type: string): string {
  switch (type) {
    case "close":
      return "Close";
    case "minimize":
      return "Minimize";
    case "hide":
      return "Hide App";
    case "enterFullScreen":
      return "Enter Full Screen";
    case "exitFullScreen":
      return "Exit Full Screen";
    case "quit":
      return "Quit App";
    case "restore":
      return "Restore";
    default:
      return type;
  }
}

export default function Command() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [stagedMoves, setStagedMoves] = useState<Map<string, StagedAction>>(new Map());

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
  const unstagedWindows = allWindows.filter((w) => !stagedMoves.has(actionKey(w)));
  const stagedWindowsArray = Array.from(stagedMoves.values());

  const windowsBySpace = new Map<string, WindowEntry[]>();
  for (const w of unstagedWindows) {
    const list = windowsBySpace.get(w.space.id) ?? [];
    list.push(w);
    windowsBySpace.set(w.space.id, list);
  }

  function stageAction(
    window: WindowEntry,
    type: "move" | "close" | "minimize" | "hide" | "enterFullScreen" | "exitFullScreen" | "quit" | "restore",
    targetSpace?: SpaceGroup,
  ) {
    const newStaged = new Map(stagedMoves);
    newStaged.set(actionKey(window), { window, type, targetSpace });
    setStagedMoves(newStaged);
  }

  function unstageAction(entry: WindowEntry) {
    const newStaged = new Map(stagedMoves);
    newStaged.delete(actionKey(entry));
    setStagedMoves(newStaged);
  }

  async function executeBatchMove() {
    if (stagedMoves.size === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No operations staged" });
      return;
    }

    setIsExecuting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Executing batch operations..." });

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
      const actionsBySource = new Map<string, StagedAction[]>();
      for (const action of stagedWindowsArray) {
        const list = actionsBySource.get(action.window.space.id) ?? [];
        list.push(action);
        actionsBySource.set(action.window.space.id, list);
      }

      let totalExecuted = 0;
      for (const [sourceId, sourceActions] of actionsBySource.entries()) {
        toast.message = `Processing ${sourceActions[0].window.space.name}...`;

        // Switch to the source space once for all its windows
        await runDesktopRenamerCommand(`switch to space "${escapeAppleScriptString(sourceId)}"`);
        await delay(600); // Give Mission Control time to settle

        for (const action of sourceActions) {
          if (action.type === "move" && action.targetSpace) {
            const isFullscreen = action.window.space.isFullscreen;
            if (isFullscreen === true) {
              toast.message = `Un-fullscreening and moving ${action.window.title}...`;
            } else {
              toast.message = `Moving ${action.window.title}...`;
            }

            await moveSpecificWindowToSpace({
              windowID: action.window.windowID,
              pid: action.window.pid,
              fromSpaceID: action.window.space.id,
              targetSpaceID: action.targetSpace.id,
            });
            await delay(isFullscreen === false ? 500 : 1700); // Wait for un-fullscreen (1.2s) + drag (0.5s)
          } else {
            toast.message = `Executing ${action.type} on ${action.window.title}...`;
            await runDesktopRenamerCommand(
              `execute window action "${action.window.windowID}" pid "${action.window.pid}" action "${action.type}"`,
            );
            await delay(400);
          }
          totalExecuted++;

          // Move and fullscreen transitions can leave macOS on another space.
          // Restore the source space before processing the next staged action.
          if (["move", "enterFullScreen", "exitFullScreen"].includes(action.type)) {
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
      toast.title = `Successfully completed ${totalExecuted} operation${totalExecuted === 1 ? "" : "s"}`;
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Batch operation failed";
      toast.message = error instanceof Error ? error.message : undefined;
      setIsExecuting(false);
    }
  }

  const ExecuteAction = () => (
    <Action
      title="Confirm & Execute Batch Operations"
      icon={Icon.Checkmark}
      shortcut={{ modifiers: ["cmd"], key: "return" }}
      onAction={executeBatchMove}
    />
  );

  return (
    <List isLoading={isLoading || isExecuting} searchBarPlaceholder="Search windows...">
      {stagedWindowsArray.length > 0 && (
        <List.Section title="Staged Actions (Pending)" subtitle={`${stagedWindowsArray.length} items`}>
          {stagedWindowsArray.map((action) => (
            <List.Item
              key={`staged_${actionKey(action.window)}`}
              title={action.window.title}
              subtitle={action.window.ownerName}
              icon={action.window.appPath ? { fileIcon: action.window.appPath } : Icon.Window}
              accessories={[
                {
                  tag: {
                    value:
                      action.type === "move" && action.targetSpace
                        ? `→ ${action.targetSpace.name}`
                        : `→ ${getActionLabel(action.type)}`,
                    color: action.type === "move" ? Color.Green : Color.Orange,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Unstage Action"
                    icon={Icon.XMarkCircle}
                    onAction={() => unstageAction(action.window)}
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
                key={`win_${actionKey(win)}`}
                title={win.title}
                subtitle={win.ownerName}
                icon={win.appPath ? { fileIcon: win.appPath } : Icon.Window}
                accessories={[
                  ...(win.isHidden === true ? [{ tag: { value: "Hidden", color: Color.Magenta } }] : []),
                  ...(win.isHidden !== true && win.isMinimized === true
                    ? [{ tag: { value: "Minimized", color: Color.Orange } }]
                    : []),
                  ...(win.space.isFullscreen ? [{ tag: { value: "Full Screen", color: Color.Blue } }] : []),
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Submenu title="Stage Move to Desktop…" icon={Icon.ArrowRight}>
                      {spaces
                        .filter((s) => s.id !== space.id && isMoveTarget(s))
                        .map((targetSpace) => (
                          <Action
                            key={targetSpace.id}
                            title={targetSpace.name}
                            icon={Icon.Desktop}
                            onAction={() => stageAction(win, "move", targetSpace)}
                          />
                        ))}
                    </ActionPanel.Submenu>
                    <ExecuteAction />
                    <ActionPanel.Section title="Stage Actions">
                      <Action
                        title="Close"
                        icon={Icon.XMarkCircle}
                        shortcut={{ modifiers: ["ctrl", "shift"], key: "w" }}
                        onAction={() => stageAction(win, "close")}
                      />
                      {(win.isMinimized !== false || win.isHidden !== false) && (
                        <Action
                          title="Restore"
                          icon={Icon.ArrowUp}
                          shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
                          onAction={() => stageAction(win, "restore")}
                        />
                      )}
                      {win.isMinimized !== true && (
                        <Action
                          title="Minimize"
                          icon={Icon.Minus}
                          shortcut={{ modifiers: ["ctrl", "shift"], key: "m" }}
                          onAction={() => stageAction(win, "minimize")}
                        />
                      )}
                      {win.isHidden !== true && (
                        <Action
                          title="Hide"
                          icon={Icon.EyeDisabled}
                          shortcut={{ modifiers: ["ctrl", "shift"], key: "h" }}
                          onAction={() => stageAction(win, "hide")}
                        />
                      )}
                      <Action
                        title={win.space.isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
                        icon={Icon.Maximize}
                        shortcut={{ modifiers: ["ctrl", "shift"], key: "f" }}
                        onAction={() => stageAction(win, win.space.isFullscreen ? "exitFullScreen" : "enterFullScreen")}
                      />
                      <Action
                        title="Quit"
                        icon={Icon.Trash}
                        shortcut={{ modifiers: ["ctrl", "shift"], key: "q" }}
                        onAction={() => stageAction(win, "quit")}
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
