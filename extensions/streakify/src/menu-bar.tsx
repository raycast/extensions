import { Icon, MenuBarExtra, LaunchType, launchCommand } from "@raycast/api";
import { useEffect, useState } from "react";
import { getStreaks, updateStreak } from "./storage";
import { getDisplayEmoji, isCheckedToday, Streak, todayDateString } from "./types";

export default function MenuBar() {
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const data = await getStreaks();
    // Only show streaks that are enabled for menu bar
    const visible = data.filter((s) => s.showInMenuBar !== false);
    visible.sort((a, b) => {
      if (a.frozen !== b.frozen) return a.frozen ? 1 : -1;
      const aChecked = isCheckedToday(a) ? 1 : 0;
      const bChecked = isCheckedToday(b) ? 1 : 0;
      if (aChecked !== bChecked) return aChecked - bChecked;
      return b.count - a.count;
    });
    setStreaks(visible);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
    // Poll storage so title stays in sync even when changes come from Manage Streaks
    const id = setInterval(() => {
      load();
    }, 3000);
    return () => clearInterval(id);
  }, []);

  async function handleCheckIn(streak: Streak) {
    if (streak.frozen || isCheckedToday(streak)) return;

    const updated: Streak = {
      ...streak,
      count: streak.count + 1,
      lastCheckedDate: todayDateString(),
    };
    await updateStreak(updated);
    await load();
  }

  async function handleToggleFreeze(streak: Streak) {
    if (streak.frozen) {
      const updated: Streak = {
        ...streak,
        frozen: false,
        lastCheckedDate: todayDateString(),
      };
      await updateStreak(updated);
    } else {
      const updated: Streak = {
        ...streak,
        frozen: true,
      };
      await updateStreak(updated);
    }
    await load();
  }

  const title = streaks.length === 0 ? "🔥" : streaks.map((s) => `${getDisplayEmoji(s)}${s.emoji}${s.count}`).join(" ");

  return (
    <MenuBarExtra title={title} isLoading={isLoading} tooltip="Streakify">
      {streaks.length === 0 ? (
        <MenuBarExtra.Item
          title="No streaks in menu bar"
          subtitle="Enable them in Manage Streaks"
          onAction={() => launchCommand({ name: "manage-streaks", type: LaunchType.UserInitiated })}
        />
      ) : (
        streaks.map((streak) => {
          const checked = isCheckedToday(streak);
          const statusEmoji = getDisplayEmoji(streak);

          let subtitle = "Tap to check in";
          if (streak.frozen) subtitle = "Frozen — tap to unfreeze";
          else if (checked) subtitle = "Done today";

          return (
            <MenuBarExtra.Item
              key={streak.id}
              title={`${statusEmoji} ${streak.emoji} ${streak.name} — Day ${streak.count}`}
              subtitle={subtitle}
              onAction={() => {
                if (streak.frozen) {
                  handleToggleFreeze(streak);
                } else if (!checked) {
                  handleCheckIn(streak);
                }
              }}
            />
          );
        })
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Manage Streaks"
          icon={Icon.List}
          onAction={() => launchCommand({ name: "manage-streaks", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Create Streak"
          icon={Icon.Plus}
          onAction={() => launchCommand({ name: "create-streak", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
