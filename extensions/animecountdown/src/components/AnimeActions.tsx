import * as React from "react";
import { Action, ActionPanel, Icon } from "@raycast/api";
import { AnimeItem } from "../models/AnimeItem";
import { AnimeViewType } from "../adapters/IAnimeAdapter";
import { CONSTANTS } from "../config/constants";

interface AnimeActionsProps {
  anime: AnimeItem;
  viewType: AnimeViewType;
  sortByHype: boolean;
  onViewTypeChange: (newViewType: AnimeViewType) => void;
  onSortToggle: () => void;
  onLayoutToggle: () => void;
  isGridView?: boolean;
}

/**
 * Shared ActionPanel component to reduce duplication between List and Grid items.
 * Provides controls for opening URLs, toggling views, switching layouts, and sorting.
 *
 * @param props - Component properties.
 * @param props.anime - The AnimeItem instance to act upon.
 * @param props.viewType - Whether we are in trending or upcoming mode.
 * @param props.sortByHype - Current sorting state.
 * @param props.onViewTypeChange - Callback to switch between sections.
 * @param props.onSortToggle - Callback to toggle hype-based sorting.
 * @param props.onLayoutToggle - Callback to switch between List and Grid.
 * @param props.isGridView - Optional flag to adjust icon/labels for grid context.
 */
export const AnimeActions = ({
  anime,
  viewType,
  sortByHype,
  onViewTypeChange,
  onSortToggle,
  onLayoutToggle,
  isGridView = false,
}: AnimeActionsProps) => {
  const isTrending = viewType === AnimeViewType.TRENDING;
  const { SHORTCUTS } = CONSTANTS;

  return (
    <ActionPanel>
      <Action.OpenInBrowser url={anime.url} title="Open on Anime Countdown" />
      <Action.CopyToClipboard content={anime.url} title="Copy URL" />
      <Action
        title={isTrending ? "Switch to Upcoming" : "Switch to Trending"}
        icon={isTrending ? Icon.Calendar : Icon.Star}
        onAction={() =>
          onViewTypeChange(
            isTrending ? AnimeViewType.UPCOMING : AnimeViewType.TRENDING,
          )
        }
        shortcut={SHORTCUTS.SWITCH_SECTION}
      />
      {isTrending && (
        <Action
          title={sortByHype ? "Disable Hype Sort" : "Sort by Hype"}
          icon={Icon.Star}
          onAction={onSortToggle}
          shortcut={SHORTCUTS.TOGGLE_SORT}
        />
      )}
      <Action
        title={isGridView ? "Switch to List View" : "Switch to Grid View"}
        icon={isGridView ? Icon.List : Icon.AppWindowGrid3x3}
        onAction={onLayoutToggle}
        shortcut={SHORTCUTS.TOGGLE_LAYOUT}
      />
    </ActionPanel>
  );
};
