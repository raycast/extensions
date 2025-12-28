import { ActionPanel, Detail } from "@raycast/api";
import { Habit, DayLog, HabitStats } from "../types/habit";
import { StorageService } from "../api/storage";
import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";

export function HabitDetails({
  habit,
}: {
  habit: Habit & { stats?: HabitStats };
}) {
  const [logs, setLogs] = useState<Record<string, DayLog>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const l = await StorageService.getLogs(habit.id);
      setLogs(l);
      setIsLoading(false);
    }
    load();
  }, [habit.id]);

  const statsMarkdown = `
# ${habit.name}

**Frequency**: ${
    typeof habit.frequency === "string" ? habit.frequency : "Custom Days"
  }
**Created**: ${new Date(habit.created_at).toLocaleDateString()}

## Streaks
- **Current Streak**: ${habit["stats"]?.current || 0} days
- **Longest Streak**: ${habit["stats"]?.longest || 0} days

## Recent Activity
| Date | Status |
|------|--------|
${Array.from({ length: 7 })
  .map((_, i) => {
    const d = subDays(new Date(), i);
    const dateStr = format(d, "yyyy-MM-dd");
    const log = logs[dateStr];
    const status = log
      ? log.status === "completed"
        ? "✅ Completed"
        : "➖ Skipped"
      : "⬜ Missed";
    return `| ${format(d, "MMM dd")} | ${status} |`;
  })
  .join("\n")}

  `;

  return (
    <Detail
      isLoading={isLoading}
      markdown={statsMarkdown}
      actions={<ActionPanel>{/* Add actions here if needed */}</ActionPanel>}
    />
  );
}
