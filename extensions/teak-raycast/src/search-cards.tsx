import { Icon } from "@raycast/api";
import { CardsListCommand } from "./components/CardsListCommand";
import { searchCards } from "./lib/api";

export default function SearchCardsCommand() {
  return (
    <CardsListCommand
      canSaveSmartFolder
      emptyDescription="Try a different keyword, tag, or phrase."
      emptyIcon={Icon.MagnifyingGlass}
      emptyTitle="No cards found"
      latestSectionTitle="Latest Teak Cards"
      loadCards={(input) => searchCards({ ...input, limit: 50 }, "interactive")}
      navigationTitle="Search Teak Cards"
      searchBarPlaceholder="Search, or filter with type:, tag:, fav, trash, hue:, #hex, after:"
    />
  );
}
