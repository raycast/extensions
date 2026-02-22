import * as React from "react";
import { Grid, Icon } from "@raycast/api";
import { AnimeViewType } from "../types/anime";
import { AnimeActions } from "./AnimeActions";
import { AnimeGridItemProps } from "../types/props";

/**
 * Component representing a single anime entry in a Grid layout.
 * Visual-heavy representation featuring a large poster and a combined info subtitle.
 * Optimized with React.memo for high-frequency countdown state updates.
 */
export const AnimeGridItem = React.memo(function AnimeGridItem({
  anime,
  viewType,
  now,
  onViewTypeChange,
  sortByHype,
  onSortToggle,
  onLayoutToggle,
}: AnimeGridItemProps) {
  const isTrending = viewType === AnimeViewType.TRENDING;
  const formattedCountdown = anime.getFormattedCountdown(now);
  const hypeText =
    isTrending && anime.hotPercentage > 0 ? `${anime.hotPercentage}% 🔥` : "";
  const episodeText = anime.episode.replace("Episode", "Ep");
  const combinedSubtitle = [episodeText, formattedCountdown, hypeText]
    .filter(Boolean)
    .join(" • ");

  return (
    <Grid.Item
      title={anime.title}
      subtitle={combinedSubtitle}
      content={anime.posterUrl || { source: Icon.Image }}
      actions={
        <AnimeActions
          anime={anime}
          viewType={viewType}
          sortByHype={sortByHype}
          onViewTypeChange={onViewTypeChange}
          onSortToggle={onSortToggle}
          onLayoutToggle={onLayoutToggle}
          isGridView
        />
      }
    />
  );
});
