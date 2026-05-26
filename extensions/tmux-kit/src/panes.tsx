import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { TmuxError, TmuxPane, killPane, listPanes } from "./lib/tmux";

export function PanesView({ session }: { session: string }) {
  const [panes, setPanes] = useState<TmuxPane[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPanes(session);
      setPanes(data);
      setError(null);
    } catch (e) {
      const msg = e instanceof TmuxError ? e.stderr || e.message : String(e);
      setError(msg);
      setPanes([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const groups = new Map<number, { name: string; panes: TmuxPane[] }>();
  for (const p of panes) {
    const existing = groups.get(p.windowIndex);
    if (existing) {
      existing.panes.push(p);
    } else {
      groups.set(p.windowIndex, { name: p.windowName, panes: [p] });
    }
  }
  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => a - b);

  return (
    <List
      isLoading={loading}
      navigationTitle={`Panes · ${session}`}
      searchBarPlaceholder="Search by command, path, PID…"
    >
      {error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to list panes"
          description={error}
        />
      )}
      {!error && !loading && panes.length === 0 && (
        <List.EmptyView
          icon={Icon.AppWindow}
          title="No panes"
          description={`Session ${session} has no panes`}
        />
      )}
      {sortedGroups.map(([wi, group]) => (
        <List.Section
          key={wi}
          title={`window ${wi}${group.name ? `: ${group.name}` : ""}`}
          subtitle={`${group.panes.length} pane${group.panes.length === 1 ? "" : "s"}`}
        >
          {group.panes
            .sort((a, b) => a.index - b.index)
            .map((p) => (
              <PaneItem key={p.id} pane={p} onChange={refresh} />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

function PaneItem({
  pane,
  onChange,
}: {
  pane: TmuxPane;
  onChange: () => Promise<void>;
}) {
  return (
    <List.Item
      title={pane.command || "(no command)"}
      subtitle={pane.path}
      icon={
        pane.active
          ? { source: Icon.Star, tintColor: Color.Yellow }
          : { source: Icon.AppWindow, tintColor: Color.SecondaryText }
      }
      keywords={[pane.command, pane.path, String(pane.pid), pane.id]}
      accessories={[
        {
          tag: {
            value: `${pane.width}×${pane.height}`,
            color: Color.SecondaryText,
          },
        },
        { text: `PID ${pane.pid}` },
        { text: pane.id },
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Path" content={pane.path} />
          <Action.CopyToClipboard
            title="Copy PID"
            content={String(pane.pid)}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
          />
          <Action.CopyToClipboard
            title="Copy Pane ID"
            content={pane.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <Action.CopyToClipboard title="Copy Command" content={pane.command} />
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
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Kill failed",
                  message:
                    e instanceof TmuxError ? e.stderr || e.message : String(e),
                });
              }
            }}
          />
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
