import { List } from "@raycast/api";
import { Quote } from "./google-finance";
import { FinancialDetails } from "./yahoo-finance";
import { StockListItem } from "./stock-list-item";

interface FavoritesListProps {
  favorites: { symbol: string; exchange?: string }[];
  quotes: Map<string, Quote>;
  financials: Map<string, FinancialDetails>;
  isShowingDetail: boolean;
  onToggleDetailView: () => void;
  isFavorite: (symbol: string) => boolean;
  onRemoveFavorite: (symbol: string) => void;
  onMoveUp: (symbol: string) => void;
  onMoveDown: (symbol: string) => void;
}

export function FavoritesList({
  favorites,
  quotes,
  financials,
  isShowingDetail,
  onToggleDetailView,
  isFavorite,
  onRemoveFavorite,
  onMoveUp,
  onMoveDown,
}: FavoritesListProps) {
  if (favorites.length === 0) {
    return null;
  }

  return (
    <List.Section title="Favorites">
      {favorites.map((fav) => {
        const quote = quotes.get(fav.symbol);
        if (!quote) return null;
        return (
          <StockListItem
            key={fav.symbol}
            quote={quote}
            financials={financials.get(fav.symbol)}
            isFavorite={isFavorite(fav.symbol)}
            isShowingDetail={isShowingDetail}
            onToggleDetailView={onToggleDetailView}
            onRemoveFavorite={() => onRemoveFavorite(fav.symbol)}
            onMoveUp={() => onMoveUp(fav.symbol)}
            onMoveDown={() => onMoveDown(fav.symbol)}
          />
        );
      })}
    </List.Section>
  );
}
