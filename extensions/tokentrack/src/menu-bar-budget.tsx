import {
  Icon,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  budgetPeriodLabel,
  budgetSpendForProvider,
  formatBudgetCapCompact,
  getProviderBudgetAmount,
} from "./lib/budget";
import { getCodexBudgetLoadRange } from "./lib/codex-budget";
import { formatCurrencyMoney, getUsageLoadRange } from "./lib/format";
import { menuBarProgressIcon } from "./lib/menu-bar-progress";
import { PROVIDERS } from "./lib/provider-meta";
import type { SourceProviderKey } from "./lib/types";
import { clearUsageSnapshotCache, loadUsage } from "./lib/usage";
import type { ProviderUsageSnapshot } from "./lib/usage-snapshot";

async function loadAllBudgetData(): Promise<
  Record<SourceProviderKey, ProviderUsageSnapshot>
> {
  const entries = await Promise.all(
    PROVIDERS.map(async ({ key }) => {
      const range =
        key === "codex" ? getCodexBudgetLoadRange() : getUsageLoadRange();
      const data = await loadUsage(range, key);
      return [key, data] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<
    SourceProviderKey,
    ProviderUsageSnapshot
  >;
}

function formatBudgetPercent(spend: number, cap: number): string {
  if (cap <= 0) return "0%";
  return `${Math.round((spend / cap) * 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}%`;
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const currency = prefs.currency || "USD";

  const { isLoading, data, revalidate } = useCachedPromise(
    loadAllBudgetData,
    [],
    { keepPreviousData: true },
  );

  const handleRefresh = () => {
    clearUsageSnapshotCache();
    revalidate();
  };

  const snapshots =
    data ??
    (Object.create(null) as Record<SourceProviderKey, ProviderUsageSnapshot>);

  return (
    <MenuBarExtra
      icon="extension-icon.png"
      tooltip="Token Track Budgets"
      isLoading={isLoading && !data}
    >
      <MenuBarExtra.Section>
        {PROVIDERS.map(({ key, title, brandColor }) => {
          const snapshot = snapshots[key];
          const cap = getProviderBudgetAmount(prefs, key);
          const spend = snapshot
            ? budgetSpendForProvider(
                key,
                snapshot.periods,
                snapshot.codexBudget,
              )
            : 0;
          const spendStr = formatCurrencyMoney(spend, currency);
          const capStr = formatBudgetCapCompact(cap, currency);
          const inactive =
            key === "codex" &&
            snapshot?.codexBudget &&
            !snapshot.codexBudget.windowActive;

          return (
            <MenuBarExtra.Item
              key={key}
              title={title}
              subtitle={
                inactive
                  ? "Starts on next use"
                  : `${spendStr} / ${capStr} · ${formatBudgetPercent(spend, cap)}`
              }
              icon={menuBarProgressIcon(spend, cap, brandColor)}
              tooltip={`${title} · ${budgetPeriodLabel(key)}`}
              onAction={() =>
                launchCommand({
                  name: "dashboard",
                  type: LaunchType.UserInitiated,
                  context: { provider: key },
                })
              }
            />
          );
        })}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={handleRefresh}
        />
        <MenuBarExtra.Item
          title="Preferences…"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
