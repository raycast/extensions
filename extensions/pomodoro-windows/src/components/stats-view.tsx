import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { HistoryEntry, PHASE_NAMES } from "../lib/engine";
import { dayLabel, formatDuration, formatTime, startOfDay } from "../lib/format";
import { getPrefs } from "../lib/prefs";
import { computeStats } from "../lib/stats";
import { clearHistory, deleteHistoryEntry, loadHistory, reconcile } from "../lib/timer";

const MAX_SHOWN = 200;

export function StatsView() {
  const [history, setHistory] = useState<HistoryEntry[]>();
  const prefs = getPrefs();

  const load = useCallback(async () => {
    await reconcile();
    setHistory(await loadHistory());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!history) return <List isLoading navigationTitle="Pomodoro Stats" />;

  const now = Date.now();
  const s = computeStats(history, now);
  const summary =
    `Pomodoro stats\n` +
    `Today: ${s.todayCount}/${prefs.dailyGoal} pomodoros, ${formatDuration(s.todayFocusMs)} focused\n` +
    `Last 7 days: ${s.weekCount} pomodoros, ${formatDuration(s.weekFocusMs)}\n` +
    `All time: ${s.totalCount} pomodoros, ${formatDuration(s.totalFocusMs)}\n` +
    `Streak: ${s.streakDays} day(s), best day: ${s.bestDayCount}`;

  const commonActions = (
    <ActionPanel.Section>
      <Action.CopyToClipboard title="Copy Summary" content={summary} />
      <Action
        title="Clear All History"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={async () => {
          const ok = await confirmAlert({
            title: "Clear all Pomodoro history?",
            message: "Your stats will reset. This can't be undone.",
            primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
          });
          if (!ok) return;
          await clearHistory();
          await load();
          await showToast({ style: Toast.Style.Success, title: "History cleared" });
        }}
      />
    </ActionPanel.Section>
  );

  // Group recent sessions by day, newest first.
  const recent = [...history].sort((a, b) => b.endedAt - a.endedAt).slice(0, MAX_SHOWN);
  const days = new Map<number, HistoryEntry[]>();
  for (const e of recent) {
    const d = startOfDay(e.endedAt);
    days.set(d, [...(days.get(d) ?? []), e]);
  }

  const statItem = (id: string, title: string, value: string, icon: Icon, color: Color, detail?: string) => (
    <List.Item
      id={id}
      title={title}
      subtitle={detail}
      icon={{ source: icon, tintColor: color }}
      accessories={[{ text: value }]}
      actions={<ActionPanel>{commonActions}</ActionPanel>}
    />
  );

  return (
    <List navigationTitle="Pomodoro Stats" searchBarPlaceholder="Filter sessions by task or type">
      <List.Section title="Overview">
        {statItem(
          "today",
          "Today",
          `${s.todayCount}/${prefs.dailyGoal} 🍅`,
          Icon.Calendar,
          Color.Red,
          formatDuration(s.todayFocusMs),
        )}
        {statItem(
          "week",
          "Last 7 Days",
          `${s.weekCount} 🍅`,
          Icon.BarChart,
          Color.Orange,
          formatDuration(s.weekFocusMs),
        )}
        {statItem("all", "All Time", `${s.totalCount} 🍅`, Icon.Trophy, Color.Yellow, formatDuration(s.totalFocusMs))}
        {statItem(
          "streak",
          "Current Streak",
          `${s.streakDays} day${s.streakDays === 1 ? "" : "s"}`,
          Icon.Bolt,
          Color.Purple,
          `Best day: ${s.bestDayCount} · Avg: ${s.averagePerActiveDay.toFixed(1)}/active day`,
        )}
      </List.Section>

      {s.topLabels.length > 0 && (
        <List.Section title="Top Tasks">
          {s.topLabels.map((t) => (
            <List.Item
              key={t.label}
              title={t.label}
              icon={{ source: Icon.Tag, tintColor: Color.Blue }}
              accessories={[{ text: `${t.count} 🍅` }, { text: formatDuration(t.focusMs), icon: Icon.Clock }]}
              actions={<ActionPanel>{commonActions}</ActionPanel>}
            />
          ))}
        </List.Section>
      )}

      {history.length === 0 && (
        <List.EmptyView
          icon={Icon.Hourglass}
          title="No sessions yet"
          description="Start a focus interval to build your stats."
        />
      )}

      {[...days.entries()].map(([day, entries]) => (
        <List.Section
          key={day}
          title={dayLabel(day, now)}
          subtitle={`${entries.filter((e) => e.phase === "focus" && e.completed).length} 🍅`}
        >
          {entries.map((e) => (
            <List.Item
              key={e.id}
              title={e.label || PHASE_NAMES[e.phase]}
              subtitle={e.label ? PHASE_NAMES[e.phase] : undefined}
              keywords={[PHASE_NAMES[e.phase], e.label ?? ""]}
              icon={
                e.phase === "focus"
                  ? {
                      source: e.completed ? Icon.CheckCircle : Icon.Circle,
                      tintColor: e.completed ? Color.Red : Color.SecondaryText,
                    }
                  : { source: Icon.Mug, tintColor: Color.Green }
              }
              accessories={[
                ...(e.completed ? [] : [{ tag: { value: "Partial", color: Color.SecondaryText } }]),
                { text: formatDuration(e.actualMs) },
                { text: `${formatTime(e.startedAt)}–${formatTime(e.endedAt)}` },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Delete Session"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ macOS: { modifiers: ["ctrl"], key: "x" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
                    onAction={async () => {
                      await deleteHistoryEntry(e.id);
                      await load();
                    }}
                  />
                  {commonActions}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
