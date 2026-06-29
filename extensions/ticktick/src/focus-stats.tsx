import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getFocusStats } from "./api/ticktick";
import { getTodayPomodoroCount, getFocusRecords } from "./api/pomodoro";
import { useAlerts } from "./hooks/useAlerts";
import { format, parseISO } from "date-fns";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function FocusStats() {
  useAlerts();

  const { data, isLoading } = useCachedPromise(
    async () => {
      const [stats, todayCount, recent] = await Promise.all([
        getFocusStats(),
        getTodayPomodoroCount(),
        getFocusRecords(10),
      ]);
      return { stats, todayCount, recent };
    },
    [],
    { keepPreviousData: true },
  );

  const stats = data?.stats;
  const recent = data?.recent ?? [];

  return (
    <List isLoading={isLoading} navigationTitle="Focus Stats" searchBarPlaceholder="">
      <List.Section title="Today">
        <List.Item
          icon={{ source: Icon.Clock, tintColor: Color.Red }}
          title={`${data?.todayCount ?? stats?.todayPomoCount ?? 0} pomodoros`}
          subtitle={
            stats?.todayPomoDuration
              ? `${formatDuration(stats.todayPomoDuration)} focused today`
              : "Focus sessions completed today"
          }
        />
      </List.Section>

      {stats && (
        <List.Section title="All Time">
          <List.Item
            icon={Icon.BarChart}
            title={`${stats.totalPomoCount ?? 0} total pomodoros`}
            subtitle={stats.totalPomoDuration ? formatDuration(stats.totalPomoDuration) : undefined}
          />
        </List.Section>
      )}

      {recent.length > 0 && (
        <List.Section title="Recent Sessions">
          {recent.map((r, i) => (
            <List.Item
              key={r.id ?? `session-${i}`}
              icon={Icon.Clock}
              title={r.taskTitle ?? r.note ?? "Focus session"}
              subtitle={r.startTime ? format(parseISO(r.startTime), "MMM d, h:mm a") : undefined}
              accessories={[{ text: formatDuration(r.duration) }]}
            />
          ))}
        </List.Section>
      )}

      <List.Section>
        <List.Item
          icon={Icon.Globe}
          title="Open Focus History in TickTick"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://ticktick.com/webapp/#p/focus" />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
