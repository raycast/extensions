import { Detail, getPreferenceValues } from "@raycast/api";
import { getIntervalHistory } from "./lib/intervals";
import { usePromise } from "@raycast/utils";
import { Interval } from "./lib/types";

function calculateStats(intervals: Interval[], startDate?: Date, endDate?: Date) {
  const focusIntervales = intervals.filter((interval) => {
    if (startDate && endDate) {
      const intervalStart = new Date(interval.parts[0].startedAt * 1000);
      return intervalStart >= startDate && intervalStart <= endDate;
    }
    return interval.type === "focus";
  });

  let completedCycles = 0;
  let totalFocusTime = 0;
  let backToBackCycles = 0;
  let prevEndAt = null;

  for (const interval of focusIntervales) {
    for (const part of interval.parts) {
      if (part.endAt) {
        completedCycles++;
        totalFocusTime += interval.length;

        if (prevEndAt && part.startedAt - prevEndAt < 5 * 60 + 10) {
          backToBackCycles++;
        }

        prevEndAt = part.endAt;
      }
    }
  }

  return { completedCycles, totalFocusTime, backToBackCycles };
}

export default function StatsPomodoro() {
  const { data, isLoading } = usePromise(getIntervalHistory);
  const { showWeeklyStats, showDailyStats } = getPreferenceValues();

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const { completedCycles, totalFocusTime, backToBackCycles } = calculateStats(data || []);
  const weeklyStats = calculateStats(data || [], startOfWeek, now);
  const dailyStats = calculateStats(data || [], startOfDay, now);

  let markdown = `# 🍅 Pomodoro Recap 🍅\n
  > 📊 Statistics of your pomodoro timer - all time\n
   - You have completed **${completedCycles}** pomodoro cycle${completedCycles > 1 ? "s" : ""}. ✨\n
   - Total of **${totalFocusTime / 60}m** of focus time. ⏱️\n
   - Total back to back Pomodoro cycle${backToBackCycles > 1 ? "s" : ""}: **${backToBackCycles}**. 👑\n
  `;

  showWeeklyStats
    ? (markdown += `
  > 📊 Weekly Stats\n
   - Pomodoro cycles completed: **${weeklyStats.completedCycles}** cycle${weeklyStats.completedCycles > 1 ? "s" : ""}. ✨\n
   - Total focus time: **${weeklyStats.totalFocusTime / 60}m**. ⏱️\n
   - Back to back Pomodoro cycle${weeklyStats.backToBackCycles > 1 ? "s" : ""}: **${weeklyStats.backToBackCycles}**. 👑\n
  `)
    : "";

  showDailyStats
    ? (markdown += `
  > 📊 Daily Stats\n
   - Pomodoro cycles completed: **${dailyStats.completedCycles}** cycles${dailyStats.completedCycles > 1 ? "s" : ""}. ✨\n
   - Total focus time: **${dailyStats.totalFocusTime / 60}m**. ⏱️\n
   - Back to back Pomodoro cycle${dailyStats.backToBackCycles > 1 ? "s" : ""}: **${dailyStats.backToBackCycles}**. 👑\n
    `)
    : "";

  return <Detail isLoading={isLoading} markdown={markdown} />;
}
