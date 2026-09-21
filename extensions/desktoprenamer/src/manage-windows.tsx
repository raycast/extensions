import { List, ActionPanel, Action, showToast, Toast, popToRoot, Icon, Color, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  moveSpecificWindowToSpace,
  getCurrentSpacesByDisplay,
  restoreSpacesByDisplay,
  getWindowsSnapshot,
  mapWindowsSnapshot,
  switchToSpace,
  executeWindowAction,
  getWindowActionLabel,
  SpaceAPIWindowEntry,
  SpaceAPIWindowSpaceRecord,
} from "./utils";
import { groupByDisplay, hasMultipleDisplays, isMoveTarget } from "./spaces";

type SpaceGroup = SpaceAPIWindowSpaceRecord;
type WindowEntry = SpaceAPIWindowEntry;

function actionKey(w: { windowID: number; pid: number }): string {
  return `${w.windowID}-${w.pid}`;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface StagedAction {
  window: WindowEntry;
  type: "move" | "close" | "minimize" | "hide" | "enterFullScreen" | "exitFullScreen" | "quit" | "restore";
  targetSpace?: SpaceGroup;
}

function getActionLabel(type: StagedAction["type"]): string {
  return type === "move" ? "Move Window" : getWindowActionLabel(type);
}

function describeBatchError(error: unknown): string {
  return error instanceof Error && error.message.length > 0 ? error.message : "The action could not be completed.";
}

export default function Command() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [stagedMoves, setStagedMoves] = useState<Map<string, StagedAction>>(new Map());
  const [terminatingPIDs, setTerminatingPIDs] = useState<Set<number>>(new Set());

  const { data, isLoading } = usePromise(async () => {
    return mapWindowsSnapshot(await getWindowsSnapshot());
  });
  const { data: currentSpaces } = usePromise(async () => {
    try {
      return await getCurrentSpacesByDisplay();
    } catch {
      return { spacesByDisplay: {} };
    }
  });

  const spaces = data?.spaces ?? [];
  const rawWindows = data?.windows ?? [];
  const allWindows = rawWindows.filter((window) => !terminatingPIDs.has(window.pid));
  const showDisplaySections = hasMultipleDisplays(spaces);
  const currentSpaceIDs = new Set(Object.values(currentSpaces?.spacesByDisplay ?? {}));

  useEffect(() => {
    if (!data) return;

    setTerminatingPIDs((previous) => {
      const next = new Set(Array.from(previous).filter((pid) => rawWindows.some((window) => window.pid === pid)));
      return next.size === previous.size ? previous : next;
    });
  }, [data, rawWindows]);

  const quittingPIDs = new Set(
    Array.from(stagedMoves.values())
      .filter((action) => action.type === "quit")
      .map((action) => action.window.pid),
  );
  const visibleWindows = allWindows.filter((window) => !quittingPIDs.has(window.pid));

  // Separate windows into staged and unstaged. Keep the app-level quit action
  // visible while hiding every other window belonging to that application.
  const unstagedWindows = visibleWindows.filter((w) => !stagedMoves.has(actionKey(w)));
  const stagedWindowsArray = Array.from(stagedMoves.values()).filter(
    (action) => action.type === "quit" || !quittingPIDs.has(action.window.pid),
  );

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
    if (type === "quit") {
      for (const [key, action] of newStaged) {
        if (action.window.pid === window.pid) newStaged.delete(key);
      }
    }
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

    const quittingPIDs = stagedWindowsArray
      .filter((action) => action.type === "quit")
      .map((action) => action.window.pid);
    if (quittingPIDs.length > 0) {
      setTerminatingPIDs((previous) => new Set([...previous, ...quittingPIDs]));
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Executing batch operations..." });

    try {
      const prefs = getPreferenceValues<Preferences>();
      const originalSpaces = prefs.returnToOriginalSpace ? await getCurrentSpacesByDisplay() : undefined;

      // Group moves by the window's SOURCE space to minimize space switching.
      const actionsBySource = new Map<string, StagedAction[]>();
      for (const action of stagedWindowsArray) {
        const list = actionsBySource.get(action.window.space.id) ?? [];
        list.push(action);
        actionsBySource.set(action.window.space.id, list);
      }

      let totalExecuted = 0;
      const failures: string[] = [];
      for (const [sourceId, sourceActions] of actionsBySource.entries()) {
        toast.message = `Processing ${sourceActions[0].window.space.name}...`;

        // Switch to the source space once for all its windows
        await switchToSpace(sourceId);
        await delay(600); // Give Mission Control time to settle

        for (const action of sourceActions) {
          let actionSucceeded = false;
          try {
            if (action.type === "move") {
              if (!action.targetSpace) {
                throw new Error(`No target desktop was selected for ${action.window.title}.`);
              }
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
                isMinimized: action.window.isMinimized,
                isHidden: action.window.isHidden,
              });
              await delay(isFullscreen === false ? 500 : 1700); // Wait for un-fullscreen (1.2s) + drag (0.5s)
            } else {
              toast.message = `${getActionLabel(action.type)} on ${action.window.title}...`;
              await executeWindowAction(
                action.window.windowID,
                action.window.pid,
                action.type,
                "Failed to execute window action",
                { showErrorToast: false },
              );
              await delay(400);
            }
            actionSucceeded = true;
            totalExecuted++;
          } catch (error) {
            failures.push(`${getActionLabel(action.type)} on "${action.window.title}": ${describeBatchError(error)}`);
          } finally {
            // Only recover the source Space after a failed action. Switching
            // back unconditionally races legacy AppleScript move requests and
            // can interrupt the native unminimize → move → re-minimize
            // transaction while it is still in progress.
            if (!actionSucceeded && ["move", "enterFullScreen", "exitFullScreen"].includes(action.type)) {
              await switchToSpace(sourceId);
              await delay(600);
            }
          }
        }
      }

      // Finally, return to the desktop where the user started the command
      if (originalSpaces) {
        toast.message = "Returning to original desktop...";
        await restoreSpacesByDisplay(originalSpaces);
      }

      if (failures.length > 0) {
        toast.style = Toast.Style.Failure;
        toast.title = `Completed ${totalExecuted} operation${totalExecuted === 1 ? "" : "s"}, skipped ${failures.length}`;
        toast.message = failures.join("\n");
      } else {
        toast.style = Toast.Style.Success;
        toast.title = `Successfully completed ${totalExecuted} operation${totalExecuted === 1 ? "" : "s"}`;
      }
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
          <List.Section
            key={space.id}
            title={showDisplaySections ? `${space.displayName} · ${space.name}` : space.name}
            subtitle={`${spaceWindows.length} windows`}
          >
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
                      {(() => {
                        const moveTargets = spaces.filter((s) => s.id !== space.id && isMoveTarget(s));
                        const makeAction = (targetSpace: SpaceGroup) => (
                          <Action
                            key={targetSpace.id}
                            title={targetSpace.name}
                            icon={
                              currentSpaceIDs.has(targetSpace.id)
                                ? { source: Icon.Circle, tintColor: Color.Blue }
                                : Icon.Desktop
                            }
                            onAction={() => stageAction(win, "move", targetSpace)}
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
