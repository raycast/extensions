import { Detail, ActionPanel, Action } from "@raycast/api";
import { Habit, DayLog } from "../types/habit";
import { StorageService } from "../api/storage";
import { useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  addMonths,
  subMonths,
  isFuture,
} from "date-fns";
import { isHabitDueOnDate } from "../utils/frequency";

export function HabitCalendar({ habit }: { habit: Habit }) {
  const [currentDate, setCurrentDate] = useState(new Date());
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

  function generateMarkdown() {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    let markdown = `# ${habit.name} - ${format(currentDate, "MMMM yyyy")}\n\n`;
    markdown += "| Su | Mo | Tu | We | Th | Fr | Sa |\n";
    markdown += "| :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n";

    let currentWeek: string[] = Array(7).fill("");

    // Fill initial empty days
    const startDay = getDay(monthStart);
    for (let i = 0; i < startDay; i++) {
      currentWeek[i] = " ";
    }

    daysInMonth.forEach((day) => {
      const dayOfWeek = getDay(day);
      const dateStr = format(day, "yyyy-MM-dd");
      const log = logs[dateStr];

      let symbol = format(day, "d"); // Default number
      const isDue = isHabitDueOnDate(habit.frequency, dateStr);

      if (log) {
        if (log.status === "completed") symbol = "✅";
        else if (log.status === "skipped") symbol = "➖";
      } else if (!isDue) {
        // Not a due day - show faded/dimmed
        symbol = `~~${symbol}~~`; // Strikethrough for not due
      } else if (isToday(day)) {
        symbol = `**${symbol}**`; // Bold today
      } else if (isFuture(day)) {
        // Future due day - just show number
      } else {
        // Past due day not completed - show with X
        symbol = `❌`;
      }

      currentWeek[dayOfWeek] = symbol;

      if (dayOfWeek === 6) {
        markdown += `| ${currentWeek.join(" | ")} |\n`;
        currentWeek = Array(7).fill(" ");
      }
    });

    // Fill remaining days of the last week if not complete
    if (getDay(monthEnd) !== 6) {
      markdown += `| ${currentWeek.join(" | ")} |\n`;
    }

    return markdown;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={generateMarkdown()}
      actions={
        <ActionPanel>
          <Action
            title="Previous Month"
            onAction={() => setCurrentDate(subMonths(currentDate, 1))}
          />
          <Action
            title="Next Month"
            onAction={() => setCurrentDate(addMonths(currentDate, 1))}
          />
        </ActionPanel>
      }
    />
  );
}
