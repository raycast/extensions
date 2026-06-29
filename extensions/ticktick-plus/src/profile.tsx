import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getUserProfile, getUserStats } from "./api/ticktick";
import { useSync } from "./hooks/useSync";
import { useAlerts } from "./hooks/useAlerts";

export default function Profile() {
  useAlerts();
  const { data: syncData } = useSync();

  const { data, isLoading } = useCachedPromise(
    async () => {
      const [profile, stats] = await Promise.all([getUserProfile(), getUserStats()]);
      return { profile, stats };
    },
    [],
    { keepPreviousData: true },
  );

  const profile = data?.profile;
  const stats = data?.stats;
  const activeTasks = syncData.tasks.length;
  const projects = syncData.projects.filter((p) => !p.closed).length;

  return (
    <List isLoading={isLoading} navigationTitle="Profile" searchBarPlaceholder="">
      <List.Section title="Account">
        <List.Item
          icon={Icon.Person}
          title={profile?.name ?? "TickTick User"}
          subtitle={profile?.email}
          accessories={profile?.pro ? [{ text: "Pro", icon: { source: Icon.Star, tintColor: Color.Yellow } }] : []}
        />
      </List.Section>

      <List.Section title="Overview">
        <List.Item icon={Icon.CheckList} title={`${activeTasks} active tasks`} />
        <List.Item icon={Icon.List} title={`${projects} projects`} />
        <List.Item icon={Icon.Tag} title={`${syncData.tags.length} tags`} />
        <List.Item icon={Icon.Filter} title={`${syncData.filters.length} smart lists`} />
        {stats?.completedTasks !== undefined && (
          <List.Item icon={Icon.Checkmark} title={`${stats.completedTasks} tasks completed`} />
        )}
        {stats?.score !== undefined && (
          <List.Item
            icon={Icon.Star}
            title={`Productivity score: ${stats.score}`}
            subtitle={stats.level ? `Level ${stats.level}` : undefined}
          />
        )}
      </List.Section>

      <List.Section>
        <List.Item
          icon={Icon.Globe}
          title="Open TickTick Settings"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://ticktick.com/webapp/#settings/profile" />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
