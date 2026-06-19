import { Icon } from "@raycast/api";
import { CardsListCommand } from "./components/CardsListCommand";
import { searchCards } from "./lib/api";

export default function SearchCardsCommand() {
  return (
    <CardsListCommand
      emptyDescription="Try a different keyword, tag, or phrase."
      emptyIcon={Icon.MagnifyingGlass}
      emptyTitle="No cards found"
      getItemIcon={(card) => (card.isFavorited ? Icon.Star : Icon.Document)}
      latestSectionTitle="Latest Teak Cards"
      loadCards={(input) => searchCards({ ...input, limit: 50 })}
      navigationTitle="Search Teak Cards"
      searchBarPlaceholder="Search cards or use type:, tag:, fav, sort:oldest"
    />
  );
}
