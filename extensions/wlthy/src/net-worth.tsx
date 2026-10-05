import { Action, ActionPanel, Color, Detail, Icon, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { getDashboard, moneyFull, money, WlthyError, baseUrl } from "./lib/api";

/**
 * Net Worth — the headline command. A Detail view: net worth up top, the
 * day / month change and the asset & debt totals in the metadata sidebar.
 * Read-only; the only actions open the wlthy web app.
 */
export default function NetWorth() {
  const { data, isLoading, error, revalidate } = usePromise(getDashboard);

  if (error) {
    const message =
      error instanceof WlthyError
        ? error.message
        : "Something went wrong reading your wlthy account.";
    return (
      <Detail
        markdown={`# Couldn't load your net worth\n\n${message}`}
        actions={
          <ActionPanel>
            <Action
              title="Try Again"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
            />
            <Action.OpenInBrowser
              title="Open Settings"
              url={`${baseUrl()}/settings?tab=api`}
            />
          </ActionPanel>
        }
      />
    );
  }

  const arrow = (usd: number) => (usd > 0 ? "▲" : usd < 0 ? "▼" : "◆");
  const tone = (usd: number) =>
    usd > 0 ? Color.Green : usd < 0 ? Color.Red : Color.SecondaryText;

  const md = data
    ? [
        `# ${moneyFull(data.net_worth_usd)}`,
        ``,
        `Net worth · ${data.asset_count} assets · ${data.debt_count} debts`,
        data.unvalued_count > 0
          ? `\n> ⚠︎ ${data.unvalued_count} asset(s) have no value yet.`
          : ``,
      ].join("\n")
    : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Today"
              text={{
                value: `${arrow(data.delta_1d_usd)} ${money(data.delta_1d_usd)} (${data.delta_1d_pct.toFixed(2)}%)`,
                color: tone(data.delta_1d_usd),
              }}
            />
            <Detail.Metadata.Label
              title="Past 30 days"
              text={{
                value: `${arrow(data.delta_30d_usd)} ${money(data.delta_30d_usd)} (${data.delta_30d_pct.toFixed(2)}%)`,
                color: tone(data.delta_30d_usd),
              }}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Assets"
              text={moneyFull(data.total_assets_usd)}
              icon={Icon.Coins}
            />
            <Detail.Metadata.Label
              title="Debts"
              text={moneyFull(data.total_debts_usd)}
              icon={Icon.Minus}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Figures in" text="USD" />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
          <Action
            title="Open Dashboard"
            icon={Icon.Globe}
            onAction={() => open(`${baseUrl()}/networth`)}
          />
          <Action.OpenInBrowser
            title="Open Allocation"
            url={`${baseUrl()}/reports`}
          />
        </ActionPanel>
      }
    />
  );
}
