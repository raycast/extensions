import { useState } from "react";
import { Grid, Icon } from "@raycast/api";

import { getGridItemSize, getGridTrendingItemSize, getServiceTitle, GRID_COLUMNS } from "../preferences";
import useLocalGifs from "../hooks/useLocalGifs";
import { GifGridSection } from "./GifGridSection";

interface LocalGifsGridProps {
  type: "favorites" | "recents";
}

/**
 * Grid that shows every saved Favorite or Recent GIF across all services, grouped by service.
 * Backs the dedicated "Browse Favorite GIFs" and "Browse Recent GIFs" commands, mirroring the
 * view you get when selecting Favorites/Recent from the search dropdown.
 */
export function LocalGifsGrid({ type }: LocalGifsGridProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const itemSize = searchTerm.length > 0 ? getGridItemSize() : getGridTrendingItemSize();

  // itemSize only feeds the grid column count below; the favorites/recents path of
  // useLocalGifs ignores it, so there's no need to pass it to the hook.
  const { allGifs, isLoading, mutate } = useLocalGifs(type);

  const isFavorites = type === "favorites";
  const emptyState = isFavorites
    ? { text: "Add some GIFs to your Favorites first…", icon: Icon.Star }
    : { text: "Work with some GIFs first…", icon: Icon.Clock };

  return (
    <Grid
      columns={GRID_COLUMNS[itemSize]}
      filtering
      isLoading={isLoading}
      searchBarPlaceholder={isFavorites ? "Search favorites" : "Search recents"}
      onSearchTextChange={setSearchTerm}
    >
      <Grid.EmptyView title={emptyState.text} icon={emptyState.icon} />
      {(allGifs ?? []).map(([service, gifs]) => (
        <GifGridSection
          key={service}
          title={getServiceTitle(service)}
          results={gifs}
          isLocalGifSection
          service={type}
          mutate={mutate}
        />
      ))}
    </Grid>
  );
}
