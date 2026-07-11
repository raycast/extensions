import { List } from "@raycast/api";
import type { Accessory } from "../agents/types";
import {
  formatErrorOrNoData,
  generateAsciiBar,
  generatePieIcon,
  getLoadingAccessory,
  getNoDataAccessory,
  renderErrorOrNoData,
} from "../agents/ui";
import type { ClaudeError, ClaudeUsage } from "./types";

function formatWindow(name: string, percent: number, resetsIn: string | null): string {
  let text = `\n\n${name}: ${generateAsciiBar(percent)} ${percent}% remaining`;
  if (resetsIn) {
    text += `\nResets In: ${resetsIn}`;
  }
  return text;
}

export function formatClaudeUsageText(usage: ClaudeUsage | null, error: ClaudeError | null): string {
  const fallback = formatErrorOrNoData("Claude", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as ClaudeUsage;

  let text = `Claude Usage\nPlan: ${u.plan}`;
  text += formatWindow("5h Limit", u.fiveHour.percentageRemaining, u.fiveHour.resetsIn);

  if (u.sevenDay) {
    text += formatWindow("Weekly Limit", u.sevenDay.percentageRemaining, u.sevenDay.resetsIn);
  }

  if (u.sevenDayModel) {
    text += formatWindow("Weekly Sonnet", u.sevenDayModel.percentageRemaining, u.sevenDayModel.resetsIn);
  }

  if (u.extraUsage) {
    text += `\n\nExtra Usage: ${u.extraUsage.currency} ${u.extraUsage.used.toFixed(2)} / ${u.extraUsage.currency} ${u.extraUsage.limit.toFixed(2)}`;
  }

  return text;
}

export function renderClaudeDetail(usage: ClaudeUsage | null, error: ClaudeError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as ClaudeUsage;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Plan" text={u.plan} />
      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label
        title="5h Limit"
        text={`${generateAsciiBar(u.fiveHour.percentageRemaining)} ${u.fiveHour.percentageRemaining}% remaining`}
      />
      {u.fiveHour.resetsIn && <List.Item.Detail.Metadata.Label title="Resets In" text={u.fiveHour.resetsIn} />}

      {u.sevenDay && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Weekly Limit"
            text={`${generateAsciiBar(u.sevenDay.percentageRemaining)} ${u.sevenDay.percentageRemaining}% remaining`}
          />
          {u.sevenDay.resetsIn && <List.Item.Detail.Metadata.Label title="Resets In" text={u.sevenDay.resetsIn} />}
        </>
      )}

      {u.sevenDayModel && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Weekly Sonnet"
            text={`${generateAsciiBar(u.sevenDayModel.percentageRemaining)} ${u.sevenDayModel.percentageRemaining}% remaining`}
          />
          {u.sevenDayModel.resetsIn && (
            <List.Item.Detail.Metadata.Label title="Resets In" text={u.sevenDayModel.resetsIn} />
          )}
        </>
      )}

      {u.extraUsage && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Extra Usage"
            text={`${u.extraUsage.currency} ${u.extraUsage.used.toFixed(2)} / ${u.extraUsage.currency} ${u.extraUsage.limit.toFixed(2)}`}
          />
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}

export function getClaudeAccessory(
  usage: ClaudeUsage | null,
  error: ClaudeError | null,
  isLoading: boolean,
): Accessory {
  if (isLoading) {
    return getLoadingAccessory("Claude");
  }

  if (error) {
    if (error.type === "not_configured") {
      return { text: "Not Configured", tooltip: error.message };
    }
    if (error.type === "missing_scope") {
      return { text: "Missing Scope", tooltip: error.message };
    }
    if (error.type === "unauthorized") {
      return { text: "Token Expired", tooltip: error.message };
    }
    if (error.type === "network_error") {
      return { text: "Network Error", tooltip: error.message };
    }
    return { text: "Error", tooltip: error.message };
  }

  if (!usage) {
    return getNoDataAccessory();
  }

  return {
    icon: generatePieIcon(usage.fiveHour.percentageRemaining),
    text: `${usage.fiveHour.percentageRemaining}%`,
    tooltip: usage.sevenDay
      ? `5h: ${usage.fiveHour.percentageRemaining}% | Weekly: ${usage.sevenDay.percentageRemaining}%`
      : `5h: ${usage.fiveHour.percentageRemaining}%`,
  };
}
