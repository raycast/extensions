import {
  getPreferenceValues,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
} from "@raycast/api";
import { budgetSpendForProvider, getProviderBudgetAmount } from "./budget";
import { getCodexBudgetLoadRange } from "./codex-budget";
import { formatCurrencyMoney, getUsageLoadRange } from "./format";
import type { SourceProviderKey } from "./types";
import { loadUsage } from "./usage";

const PROVIDER_TITLES: Record<SourceProviderKey, string> = {
  claude: "Claude Code",
  codex: "Codex",
  cursor: "Cursor",
};

export async function showQuickBudgetUsage(
  provider: SourceProviderKey,
): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Loading usage…",
  });

  try {
    const prefs = getPreferenceValues<Preferences>();
    const currency = prefs.currency || "USD";
    const range =
      provider === "codex" ? getCodexBudgetLoadRange() : getUsageLoadRange();
    const data = await loadUsage(range, provider);
    const cap = getProviderBudgetAmount(prefs, provider);
    const spend = budgetSpendForProvider(
      provider,
      data.periods,
      data.codexBudget,
    );
    const spendStr = formatCurrencyMoney(spend, currency);
    const capStr = formatCurrencyMoney(cap, currency);
    const providerTitle = PROVIDER_TITLES[provider];

    toast.style = Toast.Style.Success;
    toast.title = `${spendStr} of ${capStr}`;
    toast.message = `${providerTitle} Budget`;
    toast.primaryAction = {
      title: "Open Dashboard",
      onAction: () => {
        void launchCommand({
          name: "dashboard",
          type: LaunchType.UserInitiated,
        });
      },
    };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not load usage";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}
