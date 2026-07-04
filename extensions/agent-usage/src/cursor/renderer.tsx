import { List } from "@raycast/api";
import { formatResetTime } from "../agents/format";
import type { Accessory } from "../agents/types";
import {
  formatErrorOrNoData,
  generateAsciiBar,
  generatePieIcon,
  getLoadingAccessory,
  getNoDataAccessory,
  renderErrorOrNoData,
} from "../agents/ui";
import type { CursorError, CursorRateWindow, CursorUsage } from "./types";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatPercent(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatUsd(value: number): string {
  return usdFormatter.format(value);
}

function formatReset(value: string | null): string {
  return value ? formatResetTime(value) : "unknown";
}

function formatWindow(label: string, window: CursorRateWindow): string {
  const remaining = formatPercent(window.percentageRemaining);
  return `${label}: ${remaining}% remaining\n${generateAsciiBar(window.percentageRemaining)}\nResets In: ${formatReset(window.resetsAt)}`;
}

export function formatCursorUsageText(usage: CursorUsage | null, error: CursorError | null): string {
  const fallback = formatErrorOrNoData("Cursor", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as CursorUsage;

  let text = `Cursor Usage\nAccount: ${u.account}\nSource: ${u.source}`;
  if (u.membershipType) {
    text += `\nPlan: ${u.membershipType}`;
  }

  text += `\n\n${formatWindow(u.legacyRequests ? "Requests" : "Total", u.total)}`;
  if (u.legacyRequests) {
    text += `\n${u.legacyRequests.used} / ${u.legacyRequests.limit} requests`;
  }
  if (u.auto) {
    text += `\n\n${formatWindow("Auto", u.auto)}`;
  }
  if (u.api) {
    text += `\n\n${formatWindow("API", u.api)}`;
  }

  if (u.planLimitUsd > 0 || u.planUsedUsd > 0) {
    text += `\n\nIncluded Usage: ${formatUsd(u.planUsedUsd)} / ${formatUsd(u.planLimitUsd)}`;
  }
  if (u.onDemand) {
    text += `\nOn-demand: ${formatUsd(u.onDemand.usedUsd)}`;
    if (u.onDemand.limitUsd !== null) {
      text += ` / ${formatUsd(u.onDemand.limitUsd)}`;
    }
    if (u.onDemand.personalUsedUsd !== null) {
      text += `\nPersonal on-demand: ${formatUsd(u.onDemand.personalUsedUsd)}`;
    }
  }

  return text;
}

export function renderCursorDetail(usage: CursorUsage | null, error: CursorError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as CursorUsage;

  return (
    <List.Item.Detail.Metadata>
      {u.membershipType && (
        <>
          <List.Item.Detail.Metadata.Label title="Plan" text={u.membershipType} />
          <List.Item.Detail.Metadata.Separator />
        </>
      )}
      <List.Item.Detail.Metadata.Label
        title={u.legacyRequests ? "Requests" : "Total"}
        text={`${generateAsciiBar(u.total.percentageRemaining)} ${formatPercent(u.total.percentageRemaining)}% remaining`}
      />
      {u.legacyRequests && (
        <List.Item.Detail.Metadata.Label
          title="Request Usage"
          text={`${u.legacyRequests.used} / ${u.legacyRequests.limit} requests`}
        />
      )}
      <List.Item.Detail.Metadata.Label title="Resets In" text={formatReset(u.total.resetsAt)} />

      {u.auto && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Auto"
            text={`${generateAsciiBar(u.auto.percentageRemaining)} ${formatPercent(u.auto.percentageRemaining)}% remaining`}
          />
        </>
      )}

      {u.api && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="API"
            text={`${generateAsciiBar(u.api.percentageRemaining)} ${formatPercent(u.api.percentageRemaining)}% remaining`}
          />
        </>
      )}

      {(u.planLimitUsd > 0 || u.planUsedUsd > 0 || u.onDemand) && <List.Item.Detail.Metadata.Separator />}
      {(u.planLimitUsd > 0 || u.planUsedUsd > 0) && (
        <List.Item.Detail.Metadata.Label
          title="Included Usage"
          text={`${formatUsd(u.planUsedUsd)} / ${formatUsd(u.planLimitUsd)}`}
        />
      )}
      {u.onDemand && (
        <>
          <List.Item.Detail.Metadata.Label
            title="On-demand"
            text={
              u.onDemand.limitUsd === null
                ? formatUsd(u.onDemand.usedUsd)
                : `${formatUsd(u.onDemand.usedUsd)} / ${formatUsd(u.onDemand.limitUsd)}`
            }
          />
          {u.onDemand.personalUsedUsd !== null && (
            <List.Item.Detail.Metadata.Label title="Personal On-demand" text={formatUsd(u.onDemand.personalUsedUsd)} />
          )}
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}

export function getCursorAccessory(
  usage: CursorUsage | null,
  error: CursorError | null,
  isLoading: boolean,
): Accessory {
  if (isLoading) {
    return getLoadingAccessory("Cursor");
  }

  if (error) {
    if (error.type === "not_configured") {
      return { text: "Not Configured", tooltip: error.message };
    }
    if (error.type === "unauthorized") {
      return { text: "Session Expired", tooltip: error.message };
    }
    if (error.type === "network_error") {
      return { text: "Network Error", tooltip: error.message };
    }
    return { text: "Error", tooltip: error.message };
  }

  if (!usage) {
    return getNoDataAccessory();
  }

  const remaining = usage.total.percentageRemaining;
  const label = usage.legacyRequests ? "Requests" : "Total";
  return {
    icon: generatePieIcon(remaining),
    text: `${formatPercent(remaining)}%`,
    tooltip: `${label}: ${formatPercent(remaining)}% remaining`,
  };
}
