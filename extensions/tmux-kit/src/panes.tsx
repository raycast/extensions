import { Icon, List } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { TmuxError, TmuxPane, listPanes } from "./lib/tmux";
import { PaneItem } from "./components/pane-item";

export function PanesView({
  sessionName,
  sessionId,
}: {
  sessionName: string;
  sessionId: string;
}) {
  const [panes, setPanes] = useState<TmuxPane[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPanes(sessionId);
      setPanes(data);
      setError(null);
    } catch (e) {
      const msg = e instanceof TmuxError ? e.stderr || e.message : String(e);
      setError(msg);
      setPanes([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

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
      navigationTitle={`Panes · ${sessionName}`}
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
          description={`Session ${sessionName} has no panes`}
        />
      )}
      {sortedGroups.map(([wi, group]) => (
        <List.Section
          key={wi}
          title={`window ${wi}${group.name ? `: ${group.name}` : ""}`}
          subtitle={`${group.panes.length} pane${group.panes.length === 1 ? "" : "s"}`}
        >
          {[...group.panes]
            .sort((a, b) => a.index - b.index)
            .map((p) => (
              <PaneItem
                key={p.id}
                pane={p}
                session={sessionName}
                windowPanes={group.panes}
                hasMarkedElsewhere={panes.some(
                  (q) => q.marked && q.id !== p.id,
                )}
                onChange={refresh}
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
