import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { useState, useMemo } from "react";
import { useTeamUsers } from "./hooks/useTeamUsers";
import { useTeamTime } from "./hooks/useTeamTime";
import { useProjects } from "./hooks/useProjects";
import { getWeekRange, formatWeekLabel, getWeekDays } from "./helpers/dates";
import { formatDuration } from "./helpers/time";
import { weekDayAccessories } from "./helpers/bars";
import { TimeEntry } from "./api/time";
import MemberDetail from "./components/MemberDetail";

export default function TeamOverview() {
  const [weekOffset, setWeekOffset] = useState(0);

  const { from, to } = getWeekRange(weekOffset);
  const days = getWeekDays(weekOffset);
  const { data: users, isLoading: isLoadingUsers } = useTeamUsers();
  const { data: entries, isLoading: isLoadingTime } = useTeamTime(from, to);
  const { data: projects } = useProjects();

  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    projects?.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const totalSeconds = useMemo(() => entries?.reduce((sum, e) => sum + e.time, 0) ?? 0, [entries]);

  const memberData = useMemo(() => {
    if (!entries || !users) return [];

    const byUser = new Map<number, TimeEntry[]>();
    for (const entry of entries) {
      const list = byUser.get(entry.user) ?? [];
      list.push(entry);
      byUser.set(entry.user, list);
    }

    return users
      .map((user) => {
        const userEntries = byUser.get(user.id) ?? [];
        const total = userEntries.reduce((sum, e) => sum + e.time, 0);
        const dailySeconds: Record<string, number> = {};
        for (const e of userEntries) {
          dailySeconds[e.date] = (dailySeconds[e.date] ?? 0) + e.time;
        }
        return { user, entries: userEntries, total, dailySeconds };
      })
      .filter((m) => m.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [entries, users]);

  const weekLabel = formatWeekLabel(weekOffset);

  const navActions = (
    <ActionPanel.Section title="Navigate">
      <Action
        title="Previous Week"
        icon={Icon.ArrowLeft}
        shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
        onAction={() => setWeekOffset((o) => o - 1)}
      />
      <Action
        title="Next Week"
        icon={Icon.ArrowRight}
        shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
        onAction={() => setWeekOffset((o) => o + 1)}
      />
      <Action
        title="Current Week"
        icon={Icon.Calendar}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        onAction={() => setWeekOffset(() => 0)}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      searchBarPlaceholder={`${weekLabel}  ·  Total: ${formatDuration(totalSeconds)}`}
      isLoading={isLoadingUsers || isLoadingTime}
    >
      {!entries || memberData.length === 0 ? (
        <List.EmptyView
          title="No time entries"
          description={`No time tracked for ${weekLabel}.`}
          actions={<ActionPanel>{navActions}</ActionPanel>}
        />
      ) : (
        memberData.map(({ user, entries: userEntries, total, dailySeconds }) => (
          <List.Item
            key={user.id}
            icon={getAvatarIcon(user.name)}
            title={user.name}
            subtitle={formatDuration(total)}
            accessories={weekDayAccessories(dailySeconds, days)}
            keywords={[user.name]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Time Entries"
                  icon={Icon.Sidebar}
                  target={
                    <MemberDetail
                      user={user}
                      entries={userEntries}
                      weekDays={days}
                      isCurrentWeek={weekOffset === 0}
                      projectMap={projectMap}
                    />
                  }
                />
                {navActions}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
