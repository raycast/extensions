import { Action, ActionPanel, List } from "@raycast/api";
import { Quote } from "./google-finance";
import { FinancialDetails } from "./yahoo-finance";
import { StockDetail } from "./stock-detail";
import { changeColor, changeIcon, formatMoney } from "./utils";

interface StockListItemProps {
  quote: Quote;
  financials?: FinancialDetails | null;
  isFavorite: boolean;
  isShowingDetail: boolean;
  onToggleDetailView: () => void;
  onAddFavorite?: () => void;
  onRemoveFavorite?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function StockListItem({
  quote,
  financials,
  isFavorite,
  isShowingDetail,
  onToggleDetailView,
  onAddFavorite,
  onRemoveFavorite,
  onMoveUp,
  onMoveDown,
}: StockListItemProps) {
  const googleFinanceUrl = `https://www.google.com/finance/quote/${quote.symbol}:${quote.exchange}`;
  const priceText = formatMoney(quote.price, quote.currency);

  return (
    <List.Item
      title={quote.symbol}
      subtitle={isShowingDetail ? quote.name : undefined}
      icon={changeIcon(quote.change)}
      accessories={
        isShowingDetail
          ? []
          : [
              {
                text: {
                  value: quote.name,
                },
              },
              {
                text: {
                  value: priceText,
                  color: changeColor(quote.change),
                },
              },
            ]
      }
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
          <Action
            title={isShowingDetail ? "Switch to List View" : "Switch to Detail View"}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={onToggleDetailView}
          />
        </ActionPanel>
      }
    />
  );
}
