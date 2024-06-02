import { Detail } from "@raycast/api";
import { getIntervalHistory } from "../lib/intervals";
import { usePromise } from "@raycast/utils";
import { Interval } from "../lib/types";

function calculateStats(intervals: Interval[]) {
  const focusIntervales = intervals.filter((interval) => interval.type === "focus");
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
  const { completedCycles, totalFocusTime, backToBackCycles } = calculateStats(data || []);

  const markdown = `# 🍅 Pomodoro Recap 🍅\n
  > 📊 Statistics of your pomodoro timer - all from the begin\n
   - You have completed **${completedCycles}** pomodoro cicle${completedCycles > 1 ? "s" : ""}. ✨\n
   - Total of **${totalFocusTime / 60}m** of focus time. ⏱️\n
   - Top Number of back to back pomodoro cicle${backToBackCycles > 1 ? "s" : ""}: **${backToBackCycles}**. 👑\n
    `;

  return <Detail isLoading={isLoading} markdown={markdown} />;
}
