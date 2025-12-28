import { MenuBarExtra, Icon } from "@raycast/api";
import { useHabits } from "./hooks/useHabits";
import { StorageService } from "./api/storage";
import { HabitService } from "./api/habitService";
import { getToday_YYYYMMDD } from "./utils/date";
import { Habit } from "./types/habit";

export default function Command() {
  const { habits, isLoading, revalidate } = useHabits();

  return (
    <HabitMenuBar
      habits={habits}
      revalidate={revalidate}
      isLoading={isLoading}
    />
  );
}

function HabitMenuBar({
  habits,
  revalidate,
  isLoading,
}: {
  habits: Habit[];
  revalidate: () => void;
  isLoading: boolean;
}) {
  // We need to know which ones are done.
  // This component logic needs to be robust.
  // Let's pull the log checking into the hook or right here.

  // Quick fix: fetch today' logs map?
  // We can't easily do async in the render body without state.
  // Let's use a sub-component or hook logic.
  // Actually, `useHabits` could return `todayStatus` map if we updated it.
  // But since I can't change `useHabits` easily without context switch, let's just do a local useEffect here.

  return (
    <RealMenuBar
      habits={habits}
      revalidate={revalidate}
      isLoading={isLoading}
    />
  );
}

import { useState, useEffect } from "react";

function RealMenuBar({
  habits,
  revalidate,
  isLoading: habitsLoading,
}: {
  habits: Habit[];
  revalidate: () => void;
  isLoading: boolean;
}) {
  const [todayLogs, setTodayLogs] = useState<Record<string, string>>({});
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    async function load() {
      setLoadingLogs(true);
      const today = getToday_YYYYMMDD();
      const statusMap: Record<string, string> = {};

      for (const h of habits) {
        if (h.archived) continue;
        const logs = await StorageService.getLogs(h.id);
        if (logs[today]) {
          statusMap[h.id] = logs[today].status;
        }
      }
      setTodayLogs(statusMap);
      setLoadingLogs(false);
    }
    if (!habitsLoading) load();
  }, [habits, habitsLoading]);

  const activeHabits = habits.filter((h) => !h.archived && !h.is_paused);
  const pending = activeHabits.filter((h) => !todayLogs[h.id]);
  const completedCount = activeHabits.length - pending.length;

  const isLoading = habitsLoading || loadingLogs;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={pending.length === 0 ? Icon.CheckCircle : Icon.Circle}
      title={isLoading ? "" : `${pending.length}`}
      tooltip="Pending Habits"
    >
      <MenuBarExtra.Section title="Status">
        <MenuBarExtra.Item
          title={`${completedCount}/${activeHabits.length} Completed`}
          icon={Icon.Trophy}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Pending">
        {pending.length === 0 ? (
          <MenuBarExtra.Item title="All done for today!" icon={Icon.Check} />
        ) : (
          pending.map((h) => (
            <MenuBarExtra.Item
              key={h.id}
              title={h.name}
              icon={Icon.Circle}
              onAction={async () => {
                await HabitService.logHabit(
                  h.id,
                  "completed",
                  getToday_YYYYMMDD()
                );
                revalidate();
              }}
            />
          ))
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
