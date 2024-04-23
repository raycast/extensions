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

function countTotalFocusTime(intervals: Interval[]) {
  let total = 0;
  for (const interval of intervals) {
    for (const part of interval.parts) {
      if (part.endAt) {
        total += interval.length;
      }
    }
  }
  return total;
}

function topBackToBackCycles(intervals: Interval[]) {
  let count = 0;
  let prevEndAt = null;
  for (const interval of intervals) {
    for (const part of interval.parts) {
      // back to back cycle is defined as a cycle that starts within 5 minutes and 10 seconds of the previous cycle
      if (prevEndAt && part.startedAt - prevEndAt < 5 * 60 + 10) {
        count++;
      }
      if (part.endAt) {
        prevEndAt = part.endAt;
      }
    }
  }
  return count;
}

export default function StatsPomodoro() {
  const { data, isLoading } = usePromise(getIntervalHistory);
  const numberOfCompletedCycle = countNumberOfCompletedCycle(data || []);
  const countTotalFocus = countTotalFocusTime(data || []);
  const topBackToBackCycle = topBackToBackCycles(data || []);

  const markdown = `# 🍅 Pomodoro Recap 🍅\n
  > 📊 Statistics of your pomodoro timer - all from the begin\n
   - You have completed **${numberOfCompletedCycle}** pomodoro cicle${numberOfCompletedCycle > 1 ? "s" : ""}. ✨\n
   - Total of **${countTotalFocus / 60}m** of focus time. ⏱️\n
   - Top Number of back to back pomodoro cicle${topBackToBackCycle > 1 ? "s" : ""}: **${topBackToBackCycle}**. 👑\n
    `;

  return <Detail isLoading={isLoading} navigationTitle="Stats of pomodoro timer" markdown={markdown} />;
}
