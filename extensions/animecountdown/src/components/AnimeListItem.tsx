import * as React from "react";
import { List, Icon, Image, getPreferenceValues } from "@raycast/api";
import { AnimeViewType } from "../types/anime";
import { AnimeActions } from "./AnimeActions";
import { CONSTANTS } from "../config/constants";
import { AnimeListItemProps } from "../types/props";

/**
 * Component representing a single anime entry in a List layout.
 * Displays the poster, title (with optional truncation), episode, and countdown.
 * Optimized with React.memo to minimize re-renders during countdown updates.
 */
export const AnimeListItem = React.memo(function AnimeListItem({
  anime,
  viewType,
  now,
  onViewTypeChange,
  sortByHype,
  onSortToggle,
  onLayoutToggle,
}: AnimeListItemProps) {
  const preferences = getPreferenceValues<{ truncationLength?: string }>();
  const truncationLength =
    parseInt(preferences.truncationLength || "50", 10) ||
    CONSTANTS.UI.DEFAULT_TRUNCATION_LENGTH;

  const isTrending = viewType === AnimeViewType.TRENDING;
  const formattedCountdown = anime.getFormattedCountdown(now);

  const truncatedTitle =
    anime.title.length > truncationLength
      ? `${anime.title.substring(0, truncationLength - 3)}...`
      : anime.title;

  return (
    <List.Item
      title={truncatedTitle}
      subtitle={anime.episode}
      accessories={[
        ...(isTrending && anime.hotPercentage > 0
          ? [
              {
                tag: {
                  value: `${anime.hotPercentage}% Hype 🔥`,
                  color: "#FF6B6B",
                },
              },
            ]
          : []),
        { text: formattedCountdown, icon: Icon.Clock },
      ]}
      icon={
        anime.posterUrl
          ? {
              source: anime.posterUrl,
              mask: Image.Mask.RoundedRectangle,
            }
          : Icon.Video
      }
      actions={
        <AnimeActions
          anime={anime}
          viewType={viewType}
          sortByHype={sortByHype}
          onViewTypeChange={onViewTypeChange}
          onSortToggle={onSortToggle}
          onLayoutToggle={onLayoutToggle}
        />
      }
    />
  );
});
