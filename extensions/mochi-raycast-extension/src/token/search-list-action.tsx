import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { useEffect } from "react";
// import { Quote } from "./yahoo-finance";
// import { FavoritesStore, useFavoritesQuotes } from "./favorites-store";
// import StockListItem from "./stock-list-item";


export default function SearchListActions() {
    // if (!favorites.includes(symbol)) {
    //   return (
    //     <Action
    //       title="Add to Favorites"
    //       icon={Icon.Star}
    //       shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
    //       onAction={() => favoritesStore.add(symbol)}
    //     />
    //   );
    // }
    return (
      <Action
        title="Remove from Favorites"
        icon={Icon.StarDisabled}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        onAction={() => alert('hi')}
      />
    );
  }
  