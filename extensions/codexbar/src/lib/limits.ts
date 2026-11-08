import { PercentMode, formatDuration, formatResetIn, percentLabel, severity, shownPercent } from "./format";
import { GaugeSpec } from "./gauge";
import { computePace } from "./pace";
import { LimitWindow, ProviderUsage } from "./types";

export function windowGauge(window: LimitWindow, mode: PercentMode, now: Date = new Date()): GaugeSpec {
  const pace = computePace(window, now);
  const expectedShown =
    pace === undefined ? undefined : mode === "used" ? pace.expectedUsedPercent : 100 - pace.expectedUsedPercent;
  let subtitle = formatResetIn(window.resetsAt, now);
  if (pace && !pace.willLastToReset && pace.runsOutAt) {
    subtitle = `Runs out in ${formatDuration(pace.runsOutAt.getTime() - now.getTime())}`;
  }
  return {
    percent: shownPercent(window.usedPercent, mode),
    severity: severity(window.usedPercent),
    caption: mode === "used" ? "used" : "left",
    title: window.title,
    subtitle,
    marker: expectedShown,
  };
}

export function summaryText(data: ProviderUsage[], mode: PercentMode, now: Date = new Date()): string {
  return data
    .filter((usage) => !usage.error)
    .map((usage) =>
      [
        usage.name + (usage.plan ? ` (${usage.plan})` : ""),
        ...usage.windows.map((window) => {
          const reset = formatResetIn(window.resetsAt, now);
          return `  ${window.title}: ${percentLabel(window.usedPercent, mode)}${reset ? `, ${reset.toLowerCase()}` : ""}`;
        }),
      ].join("\n"),
    )
    .join("\n\n");
}
