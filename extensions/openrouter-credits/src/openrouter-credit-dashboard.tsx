import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { CreditsData, fetchCredits, formatCurrency } from "./openrouter";

interface Preferences {
  apiKey?: string;
  lowBalanceNotifications?: boolean;
  lowBalanceThreshold?: string;
}

function parseLowBalanceThreshold(value: string | undefined): number | null {
  const threshold = Number(value?.trim() || "5");
  return Number.isFinite(threshold) && threshold >= 0 ? threshold : null;
}

export default function Command() {
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { apiKey, lowBalanceNotifications, lowBalanceThreshold } =
    getPreferenceValues<Preferences>();
  const alertThreshold = parseLowBalanceThreshold(lowBalanceThreshold);
  const alertsEnabled = lowBalanceNotifications !== false;

  const refresh = useCallback(async () => {
    if (!apiKey) {
      setError("Add a Management API Key to view your balance.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      setCredits(await fetchCredits(apiKey));
      setError(null);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Couldn't fetch balance",
      );
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const available = credits
    ? credits.total_credits - credits.total_usage
    : null;
  const alertText = !alertsEnabled
    ? "Disabled"
    : alertThreshold === null
      ? "Invalid amount"
      : formatCurrency(alertThreshold);
  const balanceMarkdown = credits
    ? `# ${formatCurrency(available ?? 0)}\n\n## Available to Spend\n\n| Lifetime Purchased | Lifetime Used | Alert Threshold |\n| --- | --- | --- |\n| **${formatCurrency(credits.total_credits)}** | **${formatCurrency(credits.total_usage)}** | **${alertText}** |`
    : "# Loading Balance";
  const markdown = !apiKey
    ? "# Management API Key Required\n\nAdd your OpenRouter Management API Key in Preferences to view your balance."
    : error
      ? `# Couldn't Update Balance\n\n${error}`
      : available === null
        ? "# Loading Balance"
        : balanceMarkdown;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={() => void refresh()} />
          <Action
            title="Open Account Dashboard"
            onAction={() => open("https://openrouter.ai")}
          />
          <Action
            title="Preferences"
            onAction={() => void openExtensionPreferences()}
          />
        </ActionPanel>
      }
    />
  );
}
