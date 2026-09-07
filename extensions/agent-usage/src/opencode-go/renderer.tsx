import { List } from "@raycast/api";

import { formatResetTime } from "../agents/format.ts";
import type { Accessory } from "../agents/types.ts";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  generatePieIcon,
  generateAsciiBar,
} from "../agents/ui.tsx";
import type { OpencodegoUsage, OpencodegoError, OpencodegoWindowUsage } from "./types.ts";

// API percent is "percentage used", so remaining = 100 - percent
function getRemainingPercent(usedPercent: number): number {
  return Math.max(0, Math.min(100, 100 - usedPercent));
}

function formatWindowText(window: OpencodegoWindowUsage): string {
  const percent = Math.round(getRemainingPercent(window.percent));
  return `${generateAsciiBar(percent)} ${percent}% remaining`;
}

export function formatOpencodegoUsageText(usage: OpencodegoUsage | null, error: OpencodegoError | null): string {
  const fallback = formatErrorOrNoData("OpenCode Go", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as OpencodegoUsage;

  let text = "OpenCode Go Usage";

  for (const [label, window] of Object.entries({
    "Rolling limit": u.rolling,
    "Weekly limit": u.weekly,
    "Monthly limit": u.monthly,
  }) as [string, OpencodegoWindowUsage][]) {
    text += `\n\n${label}`;
    text += `\n${formatWindowText(window)}`;
    if (window.resetsAt) {
      text += `\nResets: ${formatResetTime(window.resetsAt)}`;
    }
  }

  return text;
}

export function renderOpencodegoDetail(usage: OpencodegoUsage | null, error: OpencodegoError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as OpencodegoUsage;

  const windows = [
    { key: "rolling", label: "Rolling Limit", window: u.rolling },
    { key: "weekly", label: "Weekly Limit", window: u.weekly },
    { key: "monthly", label: "Monthly Limit", window: u.monthly },
  ];

  const elements: React.ReactNode[] = [];

  for (const [idx, { key, label, window }] of windows.entries()) {
    if (idx > 0) elements.push(<List.Item.Detail.Metadata.Separator key={`sep-${key}`} />);
    elements.push(<List.Item.Detail.Metadata.Label key={key} title={label} text={formatWindowText(window)} />);
    if (window.resetsAt) {
      elements.push(
        <List.Item.Detail.Metadata.Label
          key={`${key}-reset`}
          title={`${label} Resets`}
          text={formatResetTime(window.resetsAt)}
        />,
      );
    }
  }

  return <List.Item.Detail.Metadata>{elements}</List.Item.Detail.Metadata>;
}

export function getOpencodegoAccessory(
  usage: OpencodegoUsage | null,
  error: OpencodegoError | null,
  isLoading: boolean,
): Accessory {
  if (isLoading) return getLoadingAccessory("OpenCode Go");

  if (error) {
    if (error.type === "not_configured") return { text: "Not Configured", tooltip: error.message };
    if (error.type === "unauthorized") return { text: "Auth Expired", tooltip: error.message };
    if (error.type === "forbidden") return { text: "No Go Plan", tooltip: error.message };
    if (error.type === "network_error") return { text: "Network Error", tooltip: error.message };
    return { text: "Error", tooltip: error.message };
  }

  if (!usage) return getNoDataAccessory();

  const percent = Math.round(getRemainingPercent(usage.rolling.percent));
  const tooltipParts = [
    `Rolling: ${Math.round(getRemainingPercent(usage.rolling.percent))}% remaining`,
    `Weekly: ${Math.round(getRemainingPercent(usage.weekly.percent))}% remaining`,
    `Monthly: ${Math.round(getRemainingPercent(usage.monthly.percent))}% remaining`,
  ];

  return {
    icon: generatePieIcon(percent),
    text: `${percent}%`,
    tooltip: tooltipParts.join(" | "),
  };
}
