import { Action, ActionPanel, List } from "@raycast/api";
import { Quote } from "./google-finance";
import { FinancialDetails } from "./yahoo-finance";
import { StockDetail } from "./stock-detail";
import { changeColor, changeIcon, formatMoney } from "./utils";

interface StockListItemProps {
  quote: Quote;
  financials?: FinancialDetails | null;
  isFavorite: boolean;
  onAddFavorite?: () => void;
  onRemoveFavorite?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function StockListItem({
  quote,
  financials,
  isFavorite,
  onAddFavorite,
  onRemoveFavorite,
  onMoveUp,
  onMoveDown,
}: StockListItemProps) {
  const googleFinanceUrl = `https://www.google.com/finance/quote/${quote.symbol}:${quote.exchange}`;

  return (
    <List.Item
      title={quote.symbol}
      subtitle={quote.name}
      icon={changeIcon(quote.change)}
      accessories={[
        {
          text: {
            value: formatMoney(quote.price, quote.currency),
            color: changeColor(quote.change),
          },
        },
      ]}
      detail={<StockDetail quote={quote} financials={financials} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Google Finance" url={googleFinanceUrl} />
          {isFavorite ? (
            <Action
              title="Remove from Favorites"
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={onRemoveFavorite}
            />
          ) : (
            <Action
              title="Add to Favorites"
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={onAddFavorite}
            />
          )}
          {isFavorite && onMoveUp && (
            <Action
              title="Move up in Favorites"
              shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
              onAction={onMoveUp}
            />
          )}
          {isFavorite && onMoveDown && (
            <Action
              title="Move Down in Favorites"
              shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
              onAction={onMoveDown}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
