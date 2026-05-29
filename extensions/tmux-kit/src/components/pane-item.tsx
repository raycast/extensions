import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import {
  TmuxPane,
  breakPane,
  capturePane,
  clearMarkedPane,
  clearPaneHistory,
  killOtherPanes,
  killPane,
  killWindow,
  markPane,
  swapPanes,
  swapWithMarkedPane,
  switchToWindow,
} from "../lib/tmux";
import { toastError } from "../lib/ui";
import { Direction, findNeighbor } from "../lib/layout";
import { PaneDetail } from "./pane-detail";
import { NewWindowForm, RenameWindowForm } from "./window-forms";

const SWAP_DIRECTIONS: {
  dir: Direction;
  title: string;
  key: Keyboard.KeyEquivalent;
}[] = [
  { dir: "left", title: "Swap Left", key: "arrowLeft" },
  { dir: "right", title: "Swap Right", key: "arrowRight" },
  { dir: "up", title: "Swap Up", key: "arrowUp" },
  { dir: "down", title: "Swap Down", key: "arrowDown" },
];

export function PaneItem({
  pane,
  session,
  windowPanes,
  hasMarkedElsewhere,
  onChange,
}: {
  pane: TmuxPane;
  session: string;
  windowPanes: TmuxPane[];
  hasMarkedElsewhere: boolean;
  onChange: () => Promise<void>;
}) {
  const accessories: List.Item.Accessory[] = [];
  if (pane.marked) {
    accessories.push({
      tag: { value: "MARKED", color: Color.Purple },
    });
  }
  accessories.push(
    {
      tag: {
        value: `${pane.width}×${pane.height}`,
        color: Color.SecondaryText,
      },
    },
    { text: `PID ${pane.pid}` },
    { text: pane.id },
  );

  return (
    <List.Item
      title={pane.command || "(no command)"}
      subtitle={pane.path}
      icon={
        pane.active
          ? { source: Icon.Star, tintColor: Color.Yellow }
          : { source: Icon.AppWindow, tintColor: Color.SecondaryText }
      }
      keywords={[
        pane.command,
        pane.path,
        String(pane.pid),
        pane.id,
        ...(pane.marked ? ["marked"] : []),
      ]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Path" content={pane.path} />
            <Action.Push
              title="View Pane Content"
              icon={Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              target={
                <PaneDetail
                  paneId={pane.id}
                  command={pane.command}
                  onChange={onChange}
                />
              }
            />
            <Action
              title="Copy Pane Content"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() => copyContent(pane.id, pane.command)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy Metadata">
            <Action.CopyToClipboard
              title="Copy PID"
              content={String(pane.pid)}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
            <Action.CopyToClipboard
              title="Copy Pane ID"
              content={pane.id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            />
            <Action.CopyToClipboard
              title="Copy Command"
              content={pane.command}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Move / Swap">
            {SWAP_DIRECTIONS.map(({ dir, title, key }) => {
              const neighbor = findNeighbor(windowPanes, pane, dir);
              if (!neighbor) return null;
              return (
                <Action
                  key={dir}
                  title={title}
                  icon={Icon.Switch}
                  shortcut={{ modifiers: ["ctrl", "opt"], key }}
                  onAction={async () => {
                    try {
                      await swapPanes(pane.id, neighbor.id);
                      await showToast({
                        style: Toast.Style.Success,
                        title: `Swapped ${pane.id} ${dir} with ${neighbor.id}`,
                      });
                      await onChange();
                    } catch (e) {
                      await toastError("Swap failed", e);
                    }
                  }}
                />
              );
            })}
            {pane.marked ? (
              <Action
                title="Unmark Pane"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd"], key: "m" }}
                onAction={async () => {
                  try {
                    await clearMarkedPane();
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Unmarked",
                    });
                    await onChange();
                  } catch (e) {
                    await toastError("Unmark failed", e);
                  }
                }}
              />
            ) : (
              <Action
                title="Mark Pane"
                icon={Icon.Bookmark}
                shortcut={{ modifiers: ["cmd"], key: "m" }}
                onAction={async () => {
                  try {
                    await markPane(pane.id);
                    await showToast({
                      style: Toast.Style.Success,
                      title: `Marked ${pane.id}`,
                    });
                    await onChange();
                  } catch (e) {
                    await toastError("Mark failed", e);
                  }
                }}
              />
            )}
            {hasMarkedElsewhere && !pane.marked && (
              <Action
                title="Swap with Marked Pane"
                icon={Icon.Switch}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                onAction={async () => {
                  try {
                    await swapWithMarkedPane(pane.id);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Swapped with marked pane",
                    });
                    await onChange();
                  } catch (e) {
                    await toastError("Swap failed", e);
                  }
                }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Pane">
            <Action
              title="Break to New Window"
              icon={Icon.NewDocument}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              onAction={async () => {
                try {
                  await breakPane(pane.id);
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Broke ${pane.id} into new window`,
                  });
                  await onChange();
                } catch (e) {
                  await toastError("Break failed", e);
                }
              }}
            />
            <Action
              title="Clear Pane History"
              icon={Icon.Eraser}
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
              onAction={async () => {
                try {
                  await clearPaneHistory(pane.id);
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Cleared history of ${pane.id}`,
                  });
                } catch (e) {
                  await toastError("Clear history failed", e);
                }
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Window">
            <Action
              title="Switch to Window"
              icon={Icon.Window}
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
              onAction={async () => {
                try {
                  await switchToWindow(pane.sessionId, pane.windowIndex);
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Selected window ${pane.windowIndex}`,
                  });
                  await onChange();
                } catch (e) {
                  await toastError("Switch failed", e);
                }
              }}
            />
            <Action.Push
              title="Rename Window"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              target={
                <RenameWindowForm
                  sessionId={pane.sessionId}
                  sessionName={session}
                  windowIndex={pane.windowIndex}
                  currentName={pane.windowName}
                  onDone={onChange}
                />
              }
            />
            <Action.Push
              title="New Window in This Session"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
              target={
                <NewWindowForm
                  sessionId={pane.sessionId}
                  sessionName={session}
                  onDone={onChange}
                />
              }
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Danger Zone">
            <Action
              title="Kill Pane"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                const ok = await confirmAlert({
                  title: `Kill pane ${pane.id}?`,
                  message: `Running: ${pane.command || "(none)"}  ·  PID ${pane.pid}`,
                  primaryAction: {
                    title: "Kill",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (!ok) return;
                try {
                  await killPane(pane.id);
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Killed ${pane.id}`,
                  });
                  await onChange();
                } catch (e) {
                  await toastError("Kill failed", e);
                }
              }}
            />
            <Action
              title="Kill Other Panes in Window"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
              onAction={async () => {
                const ok = await confirmAlert({
                  title: `Kill other panes in window ${pane.windowIndex}?`,
                  message: `Keeps ${pane.id} (${pane.command || "no command"}). All other panes in this window will be terminated.`,
                  primaryAction: {
                    title: "Kill Others",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (!ok) return;
                try {
                  await killOtherPanes(pane.id);
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Kept ${pane.id}, killed others`,
                  });
                  await onChange();
                } catch (e) {
                  await toastError("Kill others failed", e);
                }
              }}
            />
            <Action
              title="Kill Window"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "w" }}
              onAction={async () => {
                const label = pane.windowName
                  ? `${pane.windowIndex}: ${pane.windowName}`
                  : `${pane.windowIndex}`;
                const ok = await confirmAlert({
                  title: `Kill window ${label}?`,
                  message: `All panes in this window will be terminated.`,
                  primaryAction: {
                    title: "Kill Window",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (!ok) return;
                try {
                  await killWindow(pane.sessionId, pane.windowIndex);
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Killed window ${label}`,
                  });
                  await onChange();
                } catch (e) {
                  await toastError("Kill window failed", e);
                }
              }}
            />
          </ActionPanel.Section>

          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onChange}
          />
        </ActionPanel>
      }
    />
  );
}

async function copyContent(paneId: string, command: string): Promise<void> {
  try {
    const text = await capturePane(paneId);
    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: `Copied content of ${paneId}`,
      message: command || undefined,
    });
  } catch (e) {
    await toastError("Capture failed", e);
  }
}
