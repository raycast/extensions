import { MenuBarExtra, Color, Icon, openExtensionPreferences, Keyboard, launchCommand, LaunchType } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useMemo } from "react";
import { hasSchwabCredentials, schwabOAuth } from "../lib/oauth";
import { useAccounts } from "../hooks/useAccounts";
import { useAccountNames } from "../hooks/useAccountNames";
import { useQuotes } from "../hooks/useQuotes";
import { getAccountDisplayName, getAccountTotalValue } from "../types/accounts";
import { formatCurrency, formatCompactCurrency, formatPercent, formatChange } from "../lib/formatters";
import { getMarketStatusText } from "../lib/market-hours";

function PortfolioMenuBar() {
  const { data: accounts, isLoading } = useAccounts();
  const names = useAccountNames();
  const liveAccounts = accounts ?? [];

  const allSymbols = useMemo(() => {
    const symbols = new Set<string>();
    for (const account of liveAccounts) {
      for (const position of account.securitiesAccount.positions ?? []) {
        symbols.add(position.instrument.symbol);
      }
    }
    return Array.from(symbols);
  }, [liveAccounts]);

  const { data: quotes } = useQuotes(allSymbols);
  const liveQuotes = quotes ?? {};

  const totalValue = useMemo(() => {
    return liveAccounts.reduce((sum, a) => sum + getAccountTotalValue(a), 0);
  }, [liveAccounts]);

  const dailyPL = useMemo(() => {
    let total = 0;
    for (const account of liveAccounts) {
      for (const position of account.securitiesAccount.positions ?? []) {
        total += position.currentDayProfitLoss ?? 0;
      }
    }
    return total;
  }, [liveAccounts]);

  const startOfDayValue = totalValue - dailyPL;
  const dailyPLPct = startOfDayValue > 0 ? (dailyPL / startOfDayValue) * 100 : 0;

  const topMovers = useMemo(() => {
    const seen = new Set<string>();
    const movers: { symbol: string; changePct: number; price: number }[] = [];

    for (const account of liveAccounts) {
      for (const position of account.securitiesAccount.positions ?? []) {
        const symbol = position.instrument.symbol;
        if (seen.has(symbol)) continue;
        seen.add(symbol);

        const quote = liveQuotes[symbol];
        const changePct = quote?.quote?.netPercentChange;
        const price = quote?.quote?.lastPrice ?? quote?.quote?.mark;
        if (changePct != null && price != null) {
          movers.push({ symbol, changePct, price });
        }
      }
    }

    return movers.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 3);
  }, [liveAccounts, liveQuotes]);

  const menuIcon = {
    source: dailyPL >= 0 ? Icon.ArrowUpCircleFilled : Icon.ArrowDownCircleFilled,
    tintColor: dailyPL >= 0 ? Color.Green : Color.Red,
  };
  const marketStatus = getMarketStatusText();

  return (
    <MenuBarExtra
      icon={menuIcon}
      title={formatCompactCurrency(totalValue)}
      tooltip={`Schwab Portfolio — ${marketStatus}`}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="Today">
        <MenuBarExtra.Item
          title={`${formatChange(dailyPL)} (${formatPercent(dailyPLPct)})`}
          icon={dailyPL >= 0 ? Icon.ArrowUp : Icon.ArrowDown}
        />
        <MenuBarExtra.Item title={marketStatus} icon={Icon.Clock} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Accounts">
        {liveAccounts.map((account) => {
          const value = getAccountTotalValue(account);
          const accountDayPL = (account.securitiesAccount.positions ?? []).reduce(
            (sum, position) => sum + (position.currentDayProfitLoss ?? 0),
            0,
          );
          return (
            <MenuBarExtra.Item
              key={account.securitiesAccount.accountNumber}
              title={getAccountDisplayName(account, names)}
              subtitle={`${formatCurrency(value)} · ${formatChange(accountDayPL)}`}
            />
          );
        })}
      </MenuBarExtra.Section>

      {topMovers.length > 0 && (
        <MenuBarExtra.Section title="Top Movers">
          {topMovers.map((mover) => (
            <MenuBarExtra.Item
              key={mover.symbol}
              title={mover.symbol}
              subtitle={`${formatPercent(mover.changePct)}  ${formatCurrency(mover.price)}`}
              icon={mover.changePct >= 0 ? Icon.ArrowUp : Icon.ArrowDown}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Portfolio"
          icon={Icon.Window}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => launchCommand({ name: "portfolio", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

const Authed = withAccessToken(schwabOAuth)(PortfolioMenuBar);

export default function Command() {
  if (!hasSchwabCredentials()) {
    return (
      <MenuBarExtra icon={Icon.Key}>
        <MenuBarExtra.Item title="Set up Schwab Portfolio…" onAction={openExtensionPreferences} />
      </MenuBarExtra>
    );
  }

  return <Authed />;
}
