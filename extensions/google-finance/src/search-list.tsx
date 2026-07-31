import { Icon, List } from "@raycast/api";
import { Quote, SearchResult } from "./google-finance";
import { FinancialDetails } from "./yahoo-finance";
import { StockListItem } from "./stock-list-item";

interface SearchListProps {
  results: SearchResult[];
  quotes: Map<string, Quote>;
  financials: Map<string, FinancialDetails>;
  isShowingDetail: boolean;
  onToggleDetailView: () => void;
  isFavorite: (symbol: string) => boolean;
  onAddFavorite: (symbol: string, exchange?: string) => void;
  onRemoveFavorite: (symbol: string) => void;
}

export function SearchList({
  results,
  quotes,
  financials,
  isShowingDetail,
  onToggleDetailView,
  isFavorite,
  onAddFavorite,
  onRemoveFavorite,
}: SearchListProps) {
  if (results.length === 0) {
    return null;
  }

  return (
    <List.Section title="Search Results">
      {results.map((result) => {
        const quote = quotes.get(result.symbol);
        if (!quote) {
          return (
            <List.Item
              key={`${result.symbol}:${result.exchange}`}
              title={result.symbol}
              subtitle={result.name}
              icon={Icon.EllipsisVertical}
              accessories={[{ text: "Loading quote..." }]}
            />
          );
        }
        return (
          <StockListItem
            key={`${result.symbol}:${result.exchange}`}
            quote={quote}
            financials={financials.get(result.symbol)}
            isFavorite={isFavorite(result.symbol)}
            isShowingDetail={isShowingDetail}
            onToggleDetailView={onToggleDetailView}
            onAddFavorite={() => onAddFavorite(result.symbol, result.exchange || undefined)}
            onRemoveFavorite={() => onRemoveFavorite(result.symbol)}
          />
        );
      })}
    </List.Section>
  );
}
