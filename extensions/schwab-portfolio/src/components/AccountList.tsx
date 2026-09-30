import { List, Icon, Color, Action, ActionPanel } from "@raycast/api";
import { useState, useMemo } from "react";
import type { Account } from "../types/accounts";
import type { QuoteResponse } from "../types/quotes";
import { getAccountDisplayName, getAccountTotalValue, getCashBalance } from "../types/accounts";
import { formatChange, formatCurrency, formatPercent } from "../lib/formatters";
import { useAccountNames } from "../hooks/useAccountNames";
import { AccountDropdown } from "./AccountDropdown";
import { PositionListItem } from "./PositionListItem";
import { PortfolioChart } from "./PortfolioChart";

interface AccountListProps {
  accounts: Account[];
  quotes: QuoteResponse;
  isLoading: boolean;
}

export function AccountList({ accounts, quotes, isLoading }: AccountListProps) {
  const [selectedAccount, setSelectedAccount] = useState("all");
  const names = useAccountNames();

  const filteredAccounts = useMemo(() => {
    if (selectedAccount === "all") return accounts;
    return accounts.filter((a) => a.securitiesAccount.accountNumber === selectedAccount);
  }, [accounts, selectedAccount]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search positions..."
      searchBarAccessory={<AccountDropdown accounts={accounts} names={names} onAccountChange={setSelectedAccount} />}
    >
      <List.Item
        title="Portfolio Performance"
        subtitle="View aggregate portfolio chart"
        icon={{ source: Icon.LineChart, tintColor: Color.Purple }}
        actions={
          <ActionPanel>
            <Action.Push
              title="View Portfolio Chart"
              icon={Icon.LineChart}
              target={<PortfolioChart accounts={accounts} />}
            />
          </ActionPanel>
        }
      />
      {filteredAccounts.map((account) => {
        const sa = account.securitiesAccount;
        const name = getAccountDisplayName(account, names);
        const totalValue = getAccountTotalValue(account);
        const cash = getCashBalance(account);
        const positions = [...(sa.positions ?? [])].sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0));
        const dayPL = positions.reduce((sum, position) => sum + (position.currentDayProfitLoss ?? 0), 0);
        const startOfDayValue = totalValue - dayPL;
        const dayPLPct = startOfDayValue > 0 ? (dayPL / startOfDayValue) * 100 : 0;

        return (
          <List.Section
            key={sa.accountNumber}
            title={name}
            subtitle={`${formatCurrency(totalValue)} · ${formatChange(dayPL)} (${formatPercent(dayPLPct)}) today`}
          >
            {positions.map((position, index) => (
              <PositionListItem
                key={`${position.instrument.symbol}-${index}`}
                position={position}
                quote={quotes[position.instrument.symbol]}
              />
            ))}
            {cash > 0 && (
              <List.Item
                title="Cash"
                icon={{ source: Icon.BankNote, tintColor: Color.Green }}
                accessories={[{ text: formatCurrency(cash) }]}
              />
            )}
            {positions.length === 0 && cash === 0 && <List.Item title="No positions" icon={Icon.Minus} />}
          </List.Section>
        );
      })}
      {filteredAccounts.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Accounts Found"
          description="Check your Schwab connection"
          icon={Icon.ExclamationMark}
        />
      )}
    </List>
  );
}
