import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { ACTIVITY_WINDOW_DAYS } from "./lib/data";
import { useActivities, usePortfolio } from "./lib/hooks";
import { usePrivacy } from "./lib/privacy";
import { computeFog, fogIdleLabel, quietStreak } from "./lib/portfolio";
import { formatDate, formatMoney, formatMoneyWithCode, formatRelativeDays, mask } from "./lib/format";
import { NavigationActions, PrivacyAction, RefreshAction, TradeStubAction } from "./components/actions";
import { classifyError, DetailEmpty } from "./components/empty";

export default function ShowFog() {
  const portfolio = usePortfolio();
  const acts = useActivities(ACTIVITY_WINDOW_DAYS);
  const { privacy, ready, toggle } = usePrivacy();
  const isLoading = portfolio.isLoading || acts.isLoading || !ready;
  const refresh = async () => {
    await Promise.all([portfolio.refresh(), acts.refresh()]);
  };

  const error = portfolio.error ?? acts.error;
  if (error && (!portfolio.snapshot || !acts.activities)) {
    return <DetailEmpty kind={classifyError(error)} error={error} onRetry={refresh} />;
  }
  if (!portfolio.snapshot || !acts.activities) {
    return <Detail isLoading markdown="# Fog\n\nMeasuring idle cash…" />;
  }
  if (portfolio.snapshot.accounts.length === 0) {
    return <DetailEmpty kind="connect" onRetry={refresh} />;
  }

  const now = new Date();
  const fog = computeFog(portfolio.snapshot.accounts, acts.activities, now, ACTIVITY_WINDOW_DAYS);
  const streak = quietStreak(acts.activities, now, ACTIVITY_WINDOW_DAYS);
  const idle = fogIdleLabel(fog);
  const amount = fog.primary ? formatMoneyWithCode(fog.primary.amount, fog.primary.currency) : "—";
  const summary = `Fog: cash idle ${idle}d · ${amount} undeployed`;
  const otherCash = fog.cash.slice(1);

  const md: string[] = [
    `# ${idle} days idle`,
    "",
    `**${mask(amount, privacy)}** undeployed${otherCash.length ? ` · plus ${otherCash.map((c) => mask(formatMoneyWithCode(c.amount, c.currency), privacy)).join(", ")}` : ""}`,
    "",
    fog.atLeast
      ? `No buys or deposits in the last ${fog.windowDays} days, so the cash has been idle at least that long.`
      : `Counted from your most recent ${fog.lastBuy && (!fog.lastDeposit || fog.lastBuy >= fog.lastDeposit) ? "buy" : "deposit"} on ${formatDate(
          (fog.lastBuy && (!fog.lastDeposit || fog.lastBuy >= fog.lastDeposit)
            ? fog.lastBuy
            : fog.lastDeposit
          )?.toISOString(),
        )}. Cash can't have been idle longer than that, so this understates rather than guesses.`,
    "",
    "## Where it sits",
    "",
    "| Account | Cash |",
    "| --- | ---: |",
    ...fog.cash.flatMap((c) =>
      c.accounts.map(
        (a) =>
          `| ${a.institution} · ${a.accountName} | ${mask(formatMoney(a.amount, c.currency), privacy)} ${c.currency} |`,
      ),
    ),
    "",
    "## Quiet streak",
    "",
    streak.atLeast
      ? `No trades in the last ${streak.days} days.`
      : `${streak.days} day${streak.days === 1 ? "" : "s"} since your last trade (${formatDate(streak.lastTrade?.toISOString())}).`,
  ];

  return (
    <Detail
      isLoading={isLoading}
      markdown={md.join("\n")}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Idle" text={`${idle} days`} />
          <Detail.Metadata.Label title="Undeployed" text={mask(amount, privacy)} />
          {otherCash.map((c) => (
            <Detail.Metadata.Label
              key={c.currency}
              title={`Also in ${c.currency}`}
              text={mask(formatMoneyWithCode(c.amount, c.currency), privacy)}
            />
          ))}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Last buy"
            text={
              fog.lastBuy
                ? formatRelativeDays(Math.floor((now.getTime() - fog.lastBuy.getTime()) / 86_400_000))
                : `none in ${fog.windowDays}d`
            }
          />
          <Detail.Metadata.Label
            title="Last deposit"
            text={
              fog.lastDeposit
                ? formatRelativeDays(Math.floor((now.getTime() - fog.lastDeposit.getTime()) / 86_400_000))
                : `none in ${fog.windowDays}d`
            }
          />
          <Detail.Metadata.Label title="Quiet streak" text={`${streak.days}${streak.atLeast ? "+" : ""} days`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Window" text={`${ACTIVITY_WINDOW_DAYS} days of activity`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Fog Summary" icon={Icon.Clipboard} content={summary} />
          <PrivacyAction privacy={privacy} onToggle={toggle} />
          <RefreshAction onRefresh={refresh} />
          <TradeStubAction />
          <NavigationActions />
        </ActionPanel>
      }
    />
  );
}
