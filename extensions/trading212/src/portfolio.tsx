import { Action, ActionPanel, environment, List, type LaunchProps } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import "./hooks/locale";
import { changeColor } from "./components/colors";
import { T212ErrorEmptyView } from "./components/error-view";
import { ICONS } from "./components/icons";
import { PortfolioDetail } from "./components/portfolio-detail";
import { PositionDetail } from "./components/position-detail";
import { COPY_SHORTCUT, OpenInTrading212Action, RefreshAction } from "./components/shared";
import { usePortfolio } from "./hooks/usePortfolio";
import { usePriceChart } from "./hooks/usePriceChart";
import { formatMoney, formatPct } from "./lib/format";
import { shortTicker } from "./lib/portfolio";
import { CHART_RANGES, type ChartRange } from "./lib/yahoo/chart";

const PORTFOLIO_ID = "portfolio";

function RangeDropdown({ value, onChange }: { value: ChartRange; onChange: (range: ChartRange) => void }) {
  return (
    <List.Dropdown
      tooltip="Chart Range"
      value={value}
      onChange={(v) => onChange(CHART_RANGES.find((r) => r === v) ?? "1M")}
    >
      {CHART_RANGES.map((r) => (
        <List.Dropdown.Item key={r} title={r} value={r} />
      ))}
    </List.Dropdown>
  );
}

export default function Command(props: LaunchProps<{ launchContext?: { ticker?: string } }>) {
  const launchTicker = props.launchContext?.ticker;
  const { view, symbols, isLoading, error, revalidate } = usePortfolio();
  const [storedRange, setRange] = useCachedState<ChartRange>("chart-range", "1M");
  const range = CHART_RANGES.includes(storedRange) ? storedRange : "1M";
  const [selectedId, setSelectedId] = useState<string>(launchTicker ?? PORTFOLIO_ID);
  const appearance = environment.appearance;

  const selected = view?.positions.find((p) => p.ticker === selectedId);
  const selectedSymbol = selected ? (symbols[selected.ticker] ?? null) : null;
  const chart = usePriceChart(selectedSymbol, range);

  if (error && !view) {
    return (
      <List isLoading={isLoading}>
        <T212ErrorEmptyView error={error} onRetry={revalidate} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search positions…"
      searchBarAccessory={<RangeDropdown value={range} onChange={setRange} />}
      selectedItemId={launchTicker}
      onSelectionChange={(id) => setSelectedId(id ?? PORTFOLIO_ID)}
    >
      {view && (
        <>
          <List.Item
            id={PORTFOLIO_ID}
            icon={ICONS.portfolio}
            title="Portfolio"
            accessories={[{ text: formatMoney(view.totalBalance, view.currency) }]}
            detail={<PortfolioDetail view={view} appearance={appearance} />}
            actions={
              <ActionPanel>
                <OpenInTrading212Action />
                <RefreshAction onRefresh={revalidate} />
              </ActionPanel>
            }
          />
          <List.Section title={`Positions · ${view.positions.length}`}>
            {view.positions.map((p) => {
              const symbol = symbols[p.ticker] ?? null;
              const short = shortTicker(p.ticker);
              const isSelected = p.ticker === selectedId;
              return (
                <List.Item
                  key={p.ticker}
                  id={p.ticker}
                  title={short}
                  // The full name stays searchable and is shown in the detail pane.
                  keywords={[p.name, ...p.name.split(/\s+/), ...(symbol ? [symbol] : [])]}
                  accessories={[
                    { text: { value: formatPct(p.returnPct, { signed: true }), color: changeColor(p.returnPct) } },
                  ]}
                  detail={
                    <PositionDetail
                      position={p}
                      accountCurrency={view.currency}
                      symbol={symbol}
                      series={isSelected ? chart.series : undefined}
                      // Only the selected row fetches its chart; others keep a blank frame until selected.
                      isLoading={isSelected ? chart.isLoading : true}
                      range={range}
                      appearance={appearance}
                    />
                  }
                  actions={
                    <ActionPanel>
                      {symbol && (
                        <Action.OpenInBrowser
                          title="Open on Yahoo Finance"
                          url={`https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`}
                        />
                      )}
                      <OpenInTrading212Action />
                      <Action.CopyToClipboard title="Copy Ticker" content={short} shortcut={COPY_SHORTCUT} />
                      <RefreshAction onRefresh={revalidate} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}
