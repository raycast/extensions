import { environment, List } from "@raycast/api";
import { memo, useMemo } from "react";
import { trafficMarkdown } from "../lib/chart";
import { formatDuration, markdownText } from "../lib/format";
import type { AppUsage, Units } from "../types";

export const UsageDetail = memo(function UsageDetail({
  app,
  units,
  totalRate,
  paused,
  sampledSeconds,
  animate,
}: {
  app: AppUsage;
  units: Units;
  totalRate: number;
  paused: boolean;
  sampledSeconds: number;
  animate: boolean;
}) {
  const markdown = useMemo(() => {
    const processes = app.processes.length
      ? `| Process | PID |\n| :--- | ---: |\n${app.processes.map((info) => `| ${markdownText(info.name)} | ${info.pid} |`).join("\n")}`
      : "No network processes remain.";
    return [
      trafficMarkdown({ app, units, appearance: environment.appearance, totalRate, paused, animate }),
      `Observed for ${formatDuration(sampledSeconds)}. Totals exclude pauses.`,
      app.note ? markdownText(app.note) : "",
      "### Processes",
      processes,
    ].join("\n\n");
  }, [app, units, totalRate, paused, sampledSeconds, animate]);
  return <List.Item.Detail markdown={markdown} />;
});
