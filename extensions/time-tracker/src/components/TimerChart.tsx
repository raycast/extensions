import { Detail } from "@raycast/api";
import React from "react";
import type { Timer } from "../utils/timerUtils";

interface TimerChartProps {
  timers: Timer[];
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const result = [];
  if (hours > 0) {
    result.push(`${hours}h`);
  }
  if (minutes > 0 || hours > 0) {
    result.push(`${minutes}m`);
  }
  if (remainingSeconds > 0 || (hours === 0 && minutes === 0)) {
    result.push(`${remainingSeconds}s`);
  }

  return result.join(" ");
}

export function TimerChart({ timers }: TimerChartProps) {
  const totalTime = timers.reduce((sum, timer) => sum + timer.totalSeconds, 0);

  const data = timers.map((timer) => ({
    name: timer.name,
    time: formatTime(timer.totalSeconds),
    percentage: totalTime > 0 ? ((timer.totalSeconds / totalTime) * 100).toFixed(2) : "0.00",
  }));

  const markdownTable = `
## Time Distribution

| Timer | Time | Percentage |
|-------|------|------------|
${data.map((row) => `| ${row.name} | ${row.time} | ${row.percentage}% |`).join("\n")}

Total time: ${formatTime(totalTime)}
  `;

  return <Detail markdown={markdownTable} />;
}
