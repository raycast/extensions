import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { FlatPosition } from "../lib/portfolio";
import {
  formatMoney,
  formatMoneyWithCode,
  formatPercent,
  formatSigned,
  formatSignedPercent,
  formatUnits,
  mask,
} from "../lib/format";
import { NavigationActions, PrivacyAction, RefreshAction, SHORTCUTS, TradeStubAction } from "./actions";

interface Props {
  position: FlatPosition;
  privacy: boolean;
  showDetail: boolean;
  onToggleDetail: () => void;
  onTogglePrivacy: () => Promise<void>;
  onRefresh: () => Promise<void>;
  /** Hide the account column when the list is already scoped to one account. */
  hideAccount?: boolean;
}

function pnlColor(v: number | null): Color {
  if (v === null || v === 0) return Color.SecondaryText;
  return v > 0 ? Color.Green : Color.Red;
}

export function PositionItem({
  position: p,
  privacy,
  showDetail,
  onToggleDetail,
  onTogglePrivacy,
  onRefresh,
  hideAccount,
}: Props) {
  const value = mask(formatMoney(p.marketValue, p.currency), privacy);
  const pnl = mask(formatSigned(p.openPnl, p.currency), privacy);
  const accessories: List.Item.Accessory[] = showDetail
    ? [{ text: value }]
    : [
        ...(hideAccount ? [] : [{ tag: p.accountName, tooltip: `${p.institution} · ${p.accountName}` }]),
        ...(p.weight !== null
          ? [{ text: formatPercent(p.weight), tooltip: `Weight within ${p.currency} positions` }]
          : []),
        ...(p.openPnl !== null ? [{ tag: { value: pnl, color: pnlColor(p.openPnl) }, tooltip: "Open P&L" }] : []),
        { text: value, tooltip: "Market value" },
      ];

  const metadata = (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Ticker" text={p.ticker} />
      {p.description ? <List.Item.Detail.Metadata.Label title="Name" text={p.description} /> : null}
      <List.Item.Detail.Metadata.Label title="Account" text={`${p.institution} · ${p.accountName}`} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Market Value"
        text={mask(formatMoneyWithCode(p.marketValue, p.currency), privacy)}
      />
      <List.Item.Detail.Metadata.Label title="Units" text={mask(formatUnits(p.units), privacy)} />
      <List.Item.Detail.Metadata.Label title="Price" text={formatMoney(p.price, p.currency)} />
      <List.Item.Detail.Metadata.Label
        title="Average Cost"
        text={mask(formatMoney(p.averageCost, p.currency), privacy)}
      />
      <List.Item.Detail.Metadata.Label
        title="Open P&L"
        text={{
          value: `${pnl}${p.openPnlRatio !== null ? ` (${formatSignedPercent(p.openPnlRatio)})` : ""}`,
          color: pnlColor(p.openPnl),
        }}
      />
      {p.weight !== null ? (
        <List.Item.Detail.Metadata.Label
          title="Weight"
          text={`${formatPercent(p.weight)} of ${p.currency} positions`}
        />
      ) : null}
      <List.Item.Detail.Metadata.Separator />
      {p.securityType ? <List.Item.Detail.Metadata.Label title="Type" text={p.securityType} /> : null}
      {p.exchange ? <List.Item.Detail.Metadata.Label title="Exchange" text={p.exchange} /> : null}
      <List.Item.Detail.Metadata.Label title="Currency" text={p.currency} />
    </List.Item.Detail.Metadata>
  );

  return (
    <List.Item
      id={p.key}
      title={p.ticker}
      subtitle={showDetail ? undefined : p.description}
      keywords={[p.rawTicker, p.description, p.accountName, p.institution]}
      icon={{
        source: p.isOption ? Icon.Calendar : p.cashEquivalent ? Icon.Coins : Icon.LineChart,
        tintColor: Color.Blue,
      }}
      accessories={accessories}
      detail={<List.Item.Detail metadata={metadata} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={showDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              shortcut={SHORTCUTS.detail}
              onAction={onToggleDetail}
            />
            <Action.CopyToClipboard title="Copy Ticker" content={p.rawTicker} />
            <Action.CopyToClipboard
              title="Copy Summary"
              content={`${p.ticker} · ${formatUnits(p.units)} units · ${formatMoneyWithCode(p.marketValue, p.currency)} · P&L ${formatSigned(p.openPnl, p.currency)}`}
            />
            <Action.OpenInBrowser
              title="Open on Yahoo Finance"
              url={`https://finance.yahoo.com/quote/${encodeURIComponent(p.ticker)}`}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <PrivacyAction privacy={privacy} onToggle={onTogglePrivacy} />
            <RefreshAction onRefresh={onRefresh} />
            <TradeStubAction />
          </ActionPanel.Section>
          <NavigationActions />
        </ActionPanel>
      }
    />
  );
}
