import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { hasSchwabCredentials, schwabOAuth } from "../lib/oauth";
import { useQuotes } from "../hooks/useQuotes";
import { useWatchlist } from "../hooks/useWatchlist";
import { formatChange, formatCurrency, formatPercent } from "../lib/formatters";
import { Onboarding } from "../components/Onboarding";
import { SymbolDetail } from "../components/SymbolDetail";

function Watchlist() {
  const [searchText, setSearchText] = useState("");
  const { symbols, addSymbol, removeSymbol, isLoading: watchlistLoading } = useWatchlist();
  const { data: quotes, isLoading: quotesLoading } = useQuotes(symbols);
  const searchSymbol = searchText.trim().toUpperCase();
  const canAddSearch = searchSymbol.length > 0 && !symbols.includes(searchSymbol);

  return (
    <List
      isLoading={watchlistLoading || quotesLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search watchlist or add a symbol..."
      filtering
    >
      {canAddSearch && (
        <List.Item
          title={`Add "${searchSymbol}" to Watchlist`}
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action title="Add to Watchlist" icon={Icon.Plus} onAction={() => addSymbol(searchSymbol)} />
            </ActionPanel>
          }
        />
      )}

      {symbols.map((symbol) => {
        const quote = quotes?.[symbol];
        const price = quote?.quote?.lastPrice ?? quote?.quote?.mark;
        const dayPercent = quote?.quote?.netPercentChange;
        const dayChange = quote?.quote?.netChange;
        const accessories: List.Item.Accessory[] = [{ text: formatCurrency(price) }];

        if (dayPercent != null) {
          accessories.push({
            tag: { value: formatPercent(dayPercent), color: dayPercent >= 0 ? Color.Green : Color.Red },
          });
        }
        if (dayChange != null) {
          accessories.push({
            text: { value: formatChange(dayChange), color: dayChange >= 0 ? Color.Green : Color.Red },
          });
        }

        return (
          <List.Item
            key={symbol}
            title={symbol}
            subtitle={quote?.reference?.description}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={<SymbolDetail symbol={symbol} quote={quote} />}
                />
                <Action
                  title="Remove from Watchlist"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => removeSymbol(symbol)}
                />
                <Action.CopyToClipboard title="Copy Ticker" content={symbol} />
              </ActionPanel>
            }
          />
        );
      })}

      <List.EmptyView title="Your watchlist is empty" description="Type a ticker symbol and press Enter to add it." />
    </List>
  );
}

const Authed = withAccessToken(schwabOAuth)(Watchlist);

export default function Command() {
  return hasSchwabCredentials() ? <Authed /> : <Onboarding />;
}
