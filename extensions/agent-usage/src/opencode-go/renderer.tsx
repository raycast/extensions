import { List } from "@raycast/api";
import type { OpencodegoUsage, OpencodegoError, OpencodegoQuota } from "./types";
import type { Accessory } from "../agents/types";
import { formatResetTime, getRemainingPercent } from "../agents/format";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  generatePieIcon,
  generateAsciiBar,
} from "../agents/ui";

function formatQuotaText(quota: OpencodegoQuota): string {
  const remaining = quota.limit - quota.used;
  const percent = Math.round(getRemainingPercent(remaining, quota.limit));
  const usedStr = quota.unit ? `${quota.used} ${quota.unit}` : `${quota.used}`;
  const limitStr = quota.unit ? `${quota.limit} ${quota.unit}` : `${quota.limit}`;
  return `${usedStr}/${limitStr} (${percent}% remaining)`;
}

export function formatOpencodegoUsageText(usage: OpencodegoUsage | null, error: OpencodegoError | null): string {
  const fallback = formatErrorOrNoData("OpenCode Go", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as OpencodegoUsage;

  let text = `OpenCode Go Usage\nPlan: ${u.planName}`;

  const primaryRemaining = u.primary.limit - u.primary.used;
  const primaryPercent = Math.round(getRemainingPercent(primaryRemaining, u.primary.limit));
  text += `\n\n${u.primary.label}`;
  text += `\n${generateAsciiBar(primaryPercent)} ${formatQuotaText(u.primary)}`;

  for (const quota of u.quotas) {
    const remaining = quota.limit - quota.used;
    const percent = Math.round(getRemainingPercent(remaining, quota.limit));
    text += `\n\n${quota.label}`;
    text += `\n${generateAsciiBar(percent)} ${formatQuotaText(quota)}`;
  }

  if (u.resetsAt) {
    text += `\n\nResets: ${formatResetTime(u.resetsAt)}`;
  }

  return text;
}

export function renderOpencodegoDetail(usage: OpencodegoUsage | null, error: OpencodegoError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as OpencodegoUsage;

  const elements: React.ReactNode[] = [];

  elements.push(<List.Item.Detail.Metadata.Label key="plan" title="Plan" text={u.planName} />);

  const primaryRemaining = u.primary.limit - u.primary.used;
  const primaryPercent = Math.round(getRemainingPercent(primaryRemaining, u.primary.limit));
  elements.push(<List.Item.Detail.Metadata.Separator key="sep-primary" />);
  elements.push(
    <List.Item.Detail.Metadata.Label
      key="primary"
      title={u.primary.label}
      text={`${generateAsciiBar(primaryPercent)} ${formatQuotaText(u.primary)}`}
    />,
  );

  for (const [idx, quota] of u.quotas.entries()) {
    const remaining = quota.limit - quota.used;
    const percent = Math.round(getRemainingPercent(remaining, quota.limit));
    elements.push(<List.Item.Detail.Metadata.Separator key={`sep-${idx}`} />);
    elements.push(
      <List.Item.Detail.Metadata.Label
        key={`quota-${idx}`}
        title={quota.label}
        text={`${generateAsciiBar(percent)} ${formatQuotaText(quota)}`}
      />,
    );
  }

  if (u.resetsAt) {
    elements.push(<List.Item.Detail.Metadata.Separator key="sep-reset" />);
    elements.push(<List.Item.Detail.Metadata.Label key="reset" title="Resets In" text={formatResetTime(u.resetsAt)} />);
  }

  return <List.Item.Detail.Metadata>{...elements}</List.Item.Detail.Metadata>;
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
    if (error.type === "network_error") return { text: "Network Error", tooltip: error.message };
    return { text: "Error", tooltip: error.message };
  }

  if (!usage) return getNoDataAccessory();

  const remaining = usage.primary.limit - usage.primary.used;
  const percent = Math.round(getRemainingPercent(remaining, usage.primary.limit));

  const tooltipParts = usage.quotas.map((q) => {
    const r = q.limit - q.used;
    const pct = Math.round(getRemainingPercent(r, q.limit));
    return `${q.label}: ${pct}%`;
  });

  return {
    icon: generatePieIcon(percent),
    text: `${percent}%`,
    tooltip: tooltipParts.join(" | "),
  };
}
