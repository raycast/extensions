import { List } from "@raycast/api";
import { DroidUsage, DroidError } from "./types";
import { renderErrorDetail, renderNoDataDetail, getLoadingAccessory, getNoDataAccessory } from "../agents/ui";

function formatDate(timestamp: number): string {
  if (!timestamp) return "N/A";
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function formatDroidUsageText(usage: DroidUsage | null, error: DroidError | null): string {
  if (error) {
    return `Droid Usage\nStatus: Error\nType: ${error.type}\nMessage: ${error.message}`;
  }
  if (!usage) {
    return "Droid Usage\nStatus: No data available";
  }

  let text = `Droid Usage\nBilling Period: ${formatDate(usage.startDate)} - ${formatDate(usage.endDate)}`;
  text += `\n\nStandard Plan: ${((1 - usage.standard.usedRatio) * 100).toFixed(1)}% remaining`;
  text += `\nTokens Used: ${formatNumber(usage.standard.orgTotalTokensUsed)} / ${formatNumber(usage.standard.totalAllowance)}`;
  text += `\nUser Tokens: ${formatNumber(usage.standard.userTokens)}`;
  text += `\nBasic Allowance: ${formatNumber(usage.standard.basicAllowance)}`;
  if (usage.standard.orgOverageUsed > 0) {
    text += `\nOverage Used: ${formatNumber(usage.standard.orgOverageUsed)}`;
  }

  if (usage.premium.totalAllowance > 0) {
    text += `\n\nPremium Plan: ${((1 - usage.premium.usedRatio) * 100).toFixed(1)}% remaining`;
    text += `\nTokens Used: ${formatNumber(usage.premium.orgTotalTokensUsed)} / ${formatNumber(usage.premium.totalAllowance)}`;
    text += `\nUser Tokens: ${formatNumber(usage.premium.userTokens)}`;
    text += `\nBasic Allowance: ${formatNumber(usage.premium.basicAllowance)}`;
    if (usage.premium.orgOverageUsed > 0) {
      text += `\nOverage Used: ${formatNumber(usage.premium.orgOverageUsed)}`;
    }
  }

  return text;
}

export function renderDroidDetail(usage: DroidUsage | null, error: DroidError | null): React.ReactNode {
  if (error) {
    return renderErrorDetail(error);
  }

  if (!usage) {
    return renderNoDataDetail();
  }

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Billing Period"
        text={`${formatDate(usage.startDate)} - ${formatDate(usage.endDate)}`}
      />
      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label
        title="Standard Plan"
        text={`${((1 - usage.standard.usedRatio) * 100).toFixed(1)}% remaining`}
      />
      <List.Item.Detail.Metadata.Label
        title="Tokens Used"
        text={`${formatNumber(usage.standard.orgTotalTokensUsed)} / ${formatNumber(usage.standard.totalAllowance)}`}
      />
      <List.Item.Detail.Metadata.Label title="User Tokens" text={formatNumber(usage.standard.userTokens)} />
      <List.Item.Detail.Metadata.Label title="Basic Allowance" text={formatNumber(usage.standard.basicAllowance)} />
      {usage.standard.orgOverageUsed > 0 && (
        <List.Item.Detail.Metadata.Label title="Overage Used" text={formatNumber(usage.standard.orgOverageUsed)} />
      )}

      {usage.premium.totalAllowance > 0 && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Premium Plan"
            text={`${((1 - usage.premium.usedRatio) * 100).toFixed(1)}% remaining`}
          />
          <List.Item.Detail.Metadata.Label
            title="Tokens Used"
            text={`${formatNumber(usage.premium.orgTotalTokensUsed)} / ${formatNumber(usage.premium.totalAllowance)}`}
          />
          <List.Item.Detail.Metadata.Label title="User Tokens" text={formatNumber(usage.premium.userTokens)} />
          <List.Item.Detail.Metadata.Label title="Basic Allowance" text={formatNumber(usage.premium.basicAllowance)} />
          {usage.premium.orgOverageUsed > 0 && (
            <List.Item.Detail.Metadata.Label title="Overage Used" text={formatNumber(usage.premium.orgOverageUsed)} />
          )}
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}

export function getDroidAccessory(
  usage: DroidUsage | null,
  error: DroidError | null,
  isLoading: boolean,
): { text: string; tooltip?: string } {
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

  const standardRemaining = ((1 - usage.standard.usedRatio) * 100).toFixed(1);

  if (usage.premium.totalAllowance > 0) {
    const premiumRemaining = ((1 - usage.premium.usedRatio) * 100).toFixed(1);
    return {
      text: `${standardRemaining}%`,
      tooltip: `Standard: ${standardRemaining}% | Premium: ${premiumRemaining}%`,
    };
  }

  return {
    text: `${standardRemaining}%`,
    tooltip: `Standard Plan: ${formatNumber(usage.standard.orgTotalTokensUsed)} / ${formatNumber(usage.standard.totalAllowance)} tokens`,
  };
}
