import { List } from "@raycast/api";
import { DroidUsage, DroidError } from "./types";
import type { Accessory } from "../agents/types";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  generatePieIcon,
} from "../agents/ui";

function formatDate(timestamp: number): string {
  if (!timestamp) return "N/A";
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function formatDroidUsageText(usage: DroidUsage | null, error: DroidError | null): string {
  const fallback = formatErrorOrNoData("Droid", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as DroidUsage;

  let text = `Droid Usage\nBilling Period: ${formatDate(u.startDate)} - ${formatDate(u.endDate)}`;
  text += `\n\nStandard Plan: ${((1 - u.standard.usedRatio) * 100).toFixed(1)}% remaining`;
  text += `\nTokens Used: ${formatNumber(u.standard.orgTotalTokensUsed)} / ${formatNumber(u.standard.totalAllowance)}`;
  text += `\nUser Tokens: ${formatNumber(u.standard.userTokens)}`;
  text += `\nBasic Allowance: ${formatNumber(u.standard.basicAllowance)}`;
  if (u.standard.orgOverageUsed > 0) {
    text += `\nOverage Used: ${formatNumber(u.standard.orgOverageUsed)}`;
  }

  if (u.premium.totalAllowance > 0) {
    text += `\n\nPremium Plan: ${((1 - u.premium.usedRatio) * 100).toFixed(1)}% remaining`;
    text += `\nTokens Used: ${formatNumber(u.premium.orgTotalTokensUsed)} / ${formatNumber(u.premium.totalAllowance)}`;
    text += `\nUser Tokens: ${formatNumber(u.premium.userTokens)}`;
    text += `\nBasic Allowance: ${formatNumber(u.premium.basicAllowance)}`;
    if (u.premium.orgOverageUsed > 0) {
      text += `\nOverage Used: ${formatNumber(u.premium.orgOverageUsed)}`;
    }
  }

  return text;
}

export function renderDroidDetail(usage: DroidUsage | null, error: DroidError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as DroidUsage;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Billing Period"
        text={`${formatDate(u.startDate)} - ${formatDate(u.endDate)}`}
      />
      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label
        title="Standard Plan"
        text={`${((1 - u.standard.usedRatio) * 100).toFixed(1)}% remaining`}
      />
      <List.Item.Detail.Metadata.Label
        title="Tokens Used"
        text={`${formatNumber(u.standard.orgTotalTokensUsed)} / ${formatNumber(u.standard.totalAllowance)}`}
      />
      <List.Item.Detail.Metadata.Label title="User Tokens" text={formatNumber(u.standard.userTokens)} />
      <List.Item.Detail.Metadata.Label title="Basic Allowance" text={formatNumber(u.standard.basicAllowance)} />
      {u.standard.orgOverageUsed > 0 && (
        <List.Item.Detail.Metadata.Label title="Overage Used" text={formatNumber(u.standard.orgOverageUsed)} />
      )}

      {u.premium.totalAllowance > 0 && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Premium Plan"
            text={`${((1 - u.premium.usedRatio) * 100).toFixed(1)}% remaining`}
          />
          <List.Item.Detail.Metadata.Label
            title="Tokens Used"
            text={`${formatNumber(u.premium.orgTotalTokensUsed)} / ${formatNumber(u.premium.totalAllowance)}`}
          />
          <List.Item.Detail.Metadata.Label title="User Tokens" text={formatNumber(u.premium.userTokens)} />
          <List.Item.Detail.Metadata.Label title="Basic Allowance" text={formatNumber(u.premium.basicAllowance)} />
          {u.premium.orgOverageUsed > 0 && (
            <List.Item.Detail.Metadata.Label title="Overage Used" text={formatNumber(u.premium.orgOverageUsed)} />
          )}
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}

export function getDroidAccessory(usage: DroidUsage | null, error: DroidError | null, isLoading: boolean): Accessory {
  if (isLoading) {
    return getLoadingAccessory("Droid");
  }

  if (error) {
    if (error.type === "not_configured") {
      return { text: "Not Configured", tooltip: error.message };
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

  const standardPercent = (1 - usage.standard.usedRatio) * 100;
  const standardRemaining = standardPercent.toFixed(1);
  const icon = generatePieIcon(standardPercent);

  if (usage.premium.totalAllowance > 0) {
    const premiumRemaining = ((1 - usage.premium.usedRatio) * 100).toFixed(1);
    return {
      icon,
      text: `${standardRemaining}%`,
      tooltip: `Standard: ${standardRemaining}% | Premium: ${premiumRemaining}%`,
    };
  }

  return {
    icon,
    text: `${standardRemaining}%`,
    tooltip: `Standard Plan: ${formatNumber(usage.standard.orgTotalTokensUsed)} / ${formatNumber(usage.standard.totalAllowance)} tokens`,
  };
}
