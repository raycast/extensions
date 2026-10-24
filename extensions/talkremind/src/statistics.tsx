import { Action, ActionPanel, Application, getApplications, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getStats, Stats } from "./lib/client";
import { bar, durationText, percentText, wordsText } from "./lib/format";
import { ErrorView } from "./lib/ui";

const load = async () => ({ stats: await getStats(), apps: await getApplications() });

const dayText = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

function summary(stats: Stats) {
  return [
    `Today: ${percentText(stats.today.share)} dictated (${wordsText(stats.today)})`,
    `Last 7 days: ${percentText(stats.week.share)} dictated (${wordsText(stats.week)})`,
    stats.timeSavedThisWeekSeconds === undefined
      ? ""
      : `Time saved this week: ${durationText(stats.timeSavedThisWeekSeconds)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function Command() {
  const { data, error, isLoading, revalidate } = usePromise(load);
  const stats = data?.stats;
  const appFor = (bundleId: string): Application | undefined => data?.apps.find((a) => a.bundleId === bundleId);

  const actions = (
    <ActionPanel>
      {stats && <Action.CopyToClipboard title="Copy Summary" content={summary(stats)} />}
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={revalidate}
      />
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search statistics">
      {error && !stats ? (
        <ErrorView error={error} retry={revalidate} />
      ) : (
        stats && (
          <>
            <List.Section title="Dictation Share">
              <List.Item
                title="Today"
                subtitle={wordsText(stats.today)}
                icon={Icon.Calendar}
                accessories={[{ text: `${bar(stats.today.share)} ${percentText(stats.today.share)}` }]}
                actions={actions}
              />
              <List.Item
                title="Last 7 Days"
                subtitle={wordsText(stats.week)}
                icon={Icon.BarChart}
                accessories={[{ text: `${bar(stats.week.share)} ${percentText(stats.week.share)}` }]}
                actions={actions}
              />
              {stats.timeSavedThisWeekSeconds !== undefined && (
                <List.Item
                  title="Time Saved This Week"
                  icon={Icon.Clock}
                  accessories={[{ text: durationText(stats.timeSavedThisWeekSeconds) }]}
                  actions={actions}
                />
              )}
            </List.Section>
            <List.Section title="Day by Day">
              {[...stats.days].reverse().map((day) => (
                <List.Item
                  key={day.date}
                  title={dayText(day.date)}
                  subtitle={day.share === undefined ? "No words" : wordsText(day)}
                  icon={Icon.Dot}
                  accessories={[{ text: `${bar(day.share)} ${percentText(day.share)}` }]}
                  actions={actions}
                />
              ))}
            </List.Section>
            <List.Section title="Reminded Today" subtitle={String(stats.remindedToday.length)}>
              {stats.remindedToday.map(({ bundleID, count }) => {
                const app = appFor(bundleID);
                return (
                  <List.Item
                    key={bundleID}
                    title={app?.name ?? bundleID}
                    icon={app ? { fileIcon: app.path } : Icon.AppWindow}
                    accessories={[{ text: count === 1 ? "1 reminder" : `${count} reminders` }]}
                    actions={actions}
                  />
                );
              })}
            </List.Section>
          </>
        )
      )}
    </List>
  );
}
