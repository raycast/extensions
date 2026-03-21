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
      loadCards={(query) => searchCards(query, 50)}
      navigationTitle="Search Teak Cards"
      searchBarPlaceholder="Search Teak cards"
    />
  );
}
