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
      loadCards={(input) => searchCards({ ...input, limit: 50 }, "interactive")}
      searchBarPlaceholder="Search cards, or filter with tag:, fav, is:done, after:…"
      sectionTitle="Recent"
    />
  );
}
