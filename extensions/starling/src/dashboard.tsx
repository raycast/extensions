import { Action, ActionPanel, Color, Detail, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { MissingTokenView } from "./components/MissingTokenView";
import { accountDisplayName, formatAmount, formatDateTime } from "./lib/format";
import { showStarlingErrorToast } from "./lib/errors";
import { getResolvedPreferences } from "./lib/preferences";
import { STARLING_DEVELOPER_PORTAL_URL, getDashboard } from "./lib/starling";
import { AccountWithBalance, MinorUnitAmount, StarlingBalance } from "./lib/types";

function getNonZeroAmount(...candidates: Array<MinorUnitAmount | undefined>): MinorUnitAmount | undefined {
  for (const amount of candidates) {
    if (!amount) continue;
    if (amount.minorUnits !== 0) return amount;
  }
  return candidates.find((amount) => amount !== undefined);
}

function resolveDisplayedBalances(
  accountType: string | undefined,
  balance: StarlingBalance | undefined,
): {
  effective?: MinorUnitAmount;
  cleared?: MinorUnitAmount;
  pending?: MinorUnitAmount;
} {
  const isSavings = accountType?.toUpperCase() === "SAVINGS";

  const effective = isSavings
    ? getNonZeroAmount(
        balance?.totalEffectiveBalance,
        balance?.effectiveBalance,
        balance?.totalClearedBalance,
        balance?.clearedBalance,
        balance?.amount,
      )
    : getNonZeroAmount(
        balance?.effectiveBalance,
        balance?.totalEffectiveBalance,
        balance?.clearedBalance,
        balance?.totalClearedBalance,
        balance?.amount,
      );

  const cleared = isSavings
    ? getNonZeroAmount(
        balance?.totalClearedBalance,
        balance?.clearedBalance,
        balance?.totalEffectiveBalance,
        balance?.amount,
      )
    : getNonZeroAmount(
        balance?.clearedBalance,
        balance?.totalClearedBalance,
        balance?.effectiveBalance,
        balance?.amount,
      );

  return {
    effective,
    cleared,
    pending: balance?.pendingTransactions,
  };
}

function accountMarkdown(accountRow: AccountWithBalance, defaultCurrency: string): string {
  const { account, balance } = accountRow;
  const display = resolveDisplayedBalances(account.accountType, balance);

  const effective = formatAmount(display.effective, defaultCurrency);
  const cleared = formatAmount(display.cleared, defaultCurrency);
  const pending = formatAmount(display.pending, defaultCurrency);

  return [
    `# ${accountDisplayName(account)}`,
    "",
    `**Available now:** ${effective}`,
    "",
    `**Cleared balance:** ${cleared}`,
    "",
    `**Pending:** ${pending}`,
  ].join("\n");
}

function DashboardAccountDetail(props: {
  accountRow: AccountWithBalance;
  defaultCurrency: string;
  onReload: () => void;
}) {
  const { accountRow, defaultCurrency, onReload } = props;
  const { account } = accountRow;

  return (
    <Detail
      navigationTitle={accountDisplayName(account)}
      markdown={accountMarkdown(accountRow, defaultCurrency)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Account type" text={account.accountType || "Personal"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Currency" text={(account.currency || defaultCurrency).toUpperCase()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Opened" text={formatDateTime(account.createdAt)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Reload Accounts" icon={Icon.ArrowClockwise} onAction={onReload} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="Open Starling Website" url={STARLING_DEVELOPER_PORTAL_URL} />
        </ActionPanel>
      }
    />
  );
}

function DashboardCommand() {
  const preferences = getResolvedPreferences();
  const { data, isLoading, error, revalidate } = useCachedPromise(getDashboard, []);

  useEffect(() => {
    if (error) {
      void showStarlingErrorToast(error, "Failed to load Starling dashboard");
    }
  }, [error]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search accounts by name or type">
      <List.Section title="Accounts" subtitle={String(data?.accounts.length ?? 0)}>
        {(data?.accounts ?? []).map((accountRow) => {
          const { account, balance } = accountRow;
          const display = resolveDisplayedBalances(account.accountType, balance);
          const effective = formatAmount(display.effective, preferences.defaultCurrency);
          const effectiveMinorUnits = display.effective?.minorUnits;
          const amountColor =
            effectiveMinorUnits !== undefined && effectiveMinorUnits !== 0
              ? effectiveMinorUnits > 0
                ? Color.Green
                : Color.Red
              : undefined;

          return (
            <List.Item
              key={account.accountUid}
              icon={Icon.BankNote}
              title={accountDisplayName(account)}
              subtitle={account.accountType || "Account"}
              keywords={[account.accountType || "", account.name || ""]}
              accessories={[
                {
                  tag: {
                    value: effective,
                    color: amountColor,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Details"
                    icon={Icon.Eye}
                    target={
                      <DashboardAccountDetail
                        accountRow={accountRow}
                        defaultCurrency={preferences.defaultCurrency}
                        onReload={revalidate}
                      />
                    }
                  />
                  <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
                  <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {!isLoading && (data?.accounts.length ?? 0) === 0 ? (
        <List.EmptyView title="No accounts found" description="Check your connection or token settings." />
      ) : null}
    </List>
  );
}

export default function Command() {
  const preferences = getResolvedPreferences();

  if (!preferences.personalAccessToken && !preferences.useDemoData) {
    return <MissingTokenView />;
  }

  return <DashboardCommand />;
}
