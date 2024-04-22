import { Detail } from "@raycast/api";
import { getIntervalHistory } from "../lib/intervals";
import { usePromise } from "@raycast/utils";
import { Interval } from "../lib/types";

function countNumberOfCompletedCycle(intervals: Interval[]) {
  let count = 0;
  for (const interval of intervals) {
    for (const part of interval.parts) {
      if (part.endAt) {
        count++;
      }
    }
  }
  return count;
}

export default function StatsPomodoro() {
  const { data, isLoading } = usePromise(getIntervalHistory);
  const numberOfCompletedCycle = countNumberOfCompletedCycle(data || []);

  const markdown = `# 🍅 Pomodoro Recap 🍅\n
  > 📊 Statistics of your pomodoro timer - all from the begin\n
   - You have completed **${numberOfCompletedCycle}** pomodoro cicle${numberOfCompletedCycle > 1 ? "s" : ""}. ✨\n
   - Total of **${data?.length}h** and **${data?.length}m** of focus time. ⏱️\n
   - Top Number of back to back pomodoro cicle${data?.length === 1 ? "" : "s"}: **${data?.length}**. 👑\n
    `;

  return <Detail isLoading={isLoading} navigationTitle="Stats of pomodoro timer" markdown={markdown} />;
}
