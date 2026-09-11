import { Color, Icon, List } from "@raycast/api";
import { ReactNode } from "react";
import { currentMonthName, formatMoney, relativeTime } from "../lib/format";
import { BalanceWithDisplay, DashboardSnapshot } from "../lib/types";

const ZERO_EPSILON = 0.005;

interface Props {
  snapshot: DashboardSnapshot;
  numberFormat: string;
  summaryCurrency: string;
  hideZeroBalances: boolean;
}

export function DashboardDetail({ snapshot, numberFormat, summaryCurrency, hideZeroBalances }: Props) {
  const { total, fxRate, summary, stale, fetchedAt } = snapshot;

  const visible = hideZeroBalances
    ? snapshot.balances.filter((b) => Math.abs(b.amount.value) > ZERO_EPSILON)
    : snapshot.balances;
  const standard = sortByValue(visible.filter((b) => b.type !== "SAVINGS"));
  const savings = sortByValue(visible.filter((b) => b.type === "SAVINGS"));

  const month = currentMonthName();

  const totalDisplay = total
    ? formatMoney(total.value, total.currency, numberFormat)
    : standard[0]
      ? formatMoney(standard[0].amount.value, standard[0].currency, numberFormat)
      : "—";

  const totalTitle = total ? (total.partial ? "Total Balance (partial)" : "Total Balance") : "Primary Balance";

  const totalFxLine = total && fxRate ? formatMoney(total.value * fxRate.rate, fxRate.target, numberFormat) : undefined;
  const spentMonthFx = fxRate ? formatMoney(summary.spentMonth * fxRate.rate, fxRate.target, numberFormat) : undefined;
  const spent30Fx = fxRate ? formatMoney(summary.spent30 * fxRate.rate, fxRate.target, numberFormat) : undefined;

  const displayedRates = buildDisplayedRates(snapshot);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title={totalTitle}>
            <List.Item.Detail.Metadata.TagList.Item text={totalDisplay} color={Color.Green} />
            {totalFxLine && <List.Item.Detail.Metadata.TagList.Item text={`≈ ${totalFxLine}`} color={Color.Blue} />}
          </List.Item.Detail.Metadata.TagList>

          <List.Item.Detail.Metadata.TagList title={`Spent in ${month}`}>
            <List.Item.Detail.Metadata.TagList.Item
              text={formatMoney(summary.spentMonth, summaryCurrency, numberFormat)}
              color={Color.Orange}
            />
            {spentMonthFx && <List.Item.Detail.Metadata.TagList.Item text={`≈ ${spentMonthFx}`} color={Color.Blue} />}
          </List.Item.Detail.Metadata.TagList>

          <List.Item.Detail.Metadata.TagList title="Spent in last 30 days">
            <List.Item.Detail.Metadata.TagList.Item
              text={formatMoney(summary.spent30, summaryCurrency, numberFormat)}
              color={Color.Magenta}
            />
            {spent30Fx && <List.Item.Detail.Metadata.TagList.Item text={`≈ ${spent30Fx}`} color={Color.Blue} />}
          </List.Item.Detail.Metadata.TagList>

          {standard.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Balances"
                text={`${standard.length} ${standard.length === 1 ? "account" : "accounts"}`}
                icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
              />
              {standard.map((b) => (
                <List.Item.Detail.Metadata.TagList key={b.id} title={b.currency}>
                  {balanceTags(b, total, fxRate, numberFormat, Color.Yellow)}
                </List.Item.Detail.Metadata.TagList>
              ))}
            </>
          )}

          {savings.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Jars"
                text={`${savings.length} ${savings.length === 1 ? "jar" : "jars"}`}
                icon={{ source: Icon.SaveDocument, tintColor: Color.Purple }}
              />
              {savings.map((b) => (
                <List.Item.Detail.Metadata.TagList key={b.id} title={b.name ?? b.currency}>
                  {balanceTags(b, total, fxRate, numberFormat, Color.Purple)}
                </List.Item.Detail.Metadata.TagList>
              ))}
            </>
          )}

          {displayedRates.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Exchange Rates"
                text={`${displayedRates.length} used`}
                icon={{ source: Icon.ArrowRight, tintColor: Color.SecondaryText }}
              />
              {displayedRates.map((r) => (
                <List.Item.Detail.Metadata.Label
                  key={`${r.source}->${r.target}`}
                  title={`${r.source} → ${r.target}`}
                  text={`1 ${r.source} ≈ ${formatMoney(r.rate, r.target, numberFormat)}`}
                />
              ))}
            </>
          )}

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Updated"
            text={relativeTime(fetchedAt)}
            icon={
              stale
                ? { source: Icon.Warning, tintColor: Color.Yellow }
                : { source: Icon.CheckCircle, tintColor: Color.Green }
            }
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function balanceTags(
  b: BalanceWithDisplay,
  total: DashboardSnapshot["total"],
  fxRate: DashboardSnapshot["fxRate"],
  numberFormat: string,
  primaryColor: Color,
): ReactNode[] {
  const tags: ReactNode[] = [];
  tags.push(
    <List.Item.Detail.Metadata.TagList.Item
      key="native"
      text={formatMoney(b.amount.value, b.currency, numberFormat)}
      color={primaryColor}
    />,
  );

  const baseValueInDisplay = !total || b.currency === total.currency ? b.amount.value : b.displayEquiv;

  if (total && b.currency !== total.currency) {
    if (b.displayEquiv != null) {
      tags.push(
        <List.Item.Detail.Metadata.TagList.Item
          key="display"
          text={`≈ ${formatMoney(b.displayEquiv, total.currency, numberFormat)}`}
          color={Color.Blue}
        />,
      );
    } else {
      tags.push(<List.Item.Detail.Metadata.TagList.Item key="no-fx" text="⚠ no FX rate" color={Color.Red} />);
    }
  }

  if (fxRate && baseValueInDisplay != null && b.currency !== fxRate.target) {
    tags.push(
      <List.Item.Detail.Metadata.TagList.Item
        key="fx"
        text={`≈ ${formatMoney(baseValueInDisplay * fxRate.rate, fxRate.target, numberFormat)}`}
        color={Color.Blue}
      />,
    );
  }

  return tags;
}

function buildDisplayedRates(snapshot: DashboardSnapshot): { source: string; target: string; rate: number }[] {
  const raw = snapshot.usedRates ?? [];
  const base = snapshot.total?.currency;
  if (!base) return raw;
  const out: { source: string; target: string; rate: number }[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    let entry: { source: string; target: string; rate: number };
    if (r.target === base && r.source !== base) {
      entry = { source: base, target: r.source, rate: 1 / r.rate };
    } else if (r.source === base) {
      entry = r;
    } else {
      continue;
    }
    const key = `${entry.source}->${entry.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

function sortByValue(balances: BalanceWithDisplay[]): BalanceWithDisplay[] {
  return [...balances].sort((a, b) => {
    const ae = a.displayEquiv ?? a.amount.value;
    const be = b.displayEquiv ?? b.amount.value;
    return be - ae;
  });
}
