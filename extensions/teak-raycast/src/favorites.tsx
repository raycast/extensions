import { Icon } from "@raycast/api";
import { CardsListCommand } from "./components/CardsListCommand";
import { getFavoriteCards } from "./lib/api";

export default function FavoritesCommand() {
  return (
    <CardsListCommand
      emptyDescription="Mark cards as favorites in Teak to see them here."
      emptyIcon={Icon.Star}
      emptyTitle="No favorites found"
      loadCards={(input) =>
        getFavoriteCards({ ...input, limit: 50 }, "interactive")
      }
      removeUnfavoritedFromList
      searchBarPlaceholder="Search favorites, or filter with tag:, hue:, after:…"
      sectionTitle="Favorites"
    />
  );
}
