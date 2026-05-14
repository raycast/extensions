import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Color,
} from "@raycast/api";
import { useState, useMemo } from "react";
import { usePopularDirections } from "../hooks/usePopularDirections";
import { useFavoriteDirections } from "../hooks/useFavorites";
import { currencyIcon } from "../utils/icon";
import { formatListRate } from "../utils/format";
import { directionUrl } from "../utils/url";
import {
  toggleFavoriteDirection,
  isFavoriteDirection,
} from "../utils/favorites";
import type { PopularDirection, Tag } from "../api/types";
import DirectionView from "./direction";

export default function ExchangeRates() {
  const {
    data: directions,
    isLoading,
    error,
    revalidate,
  } = usePopularDirections();
  const { data: favDirections, revalidate: revalidateFavs } =
    useFavoriteDirections();
  const [selectedTag, setSelectedTag] = useState("all");

  // Build smart tabs from directions (tag pairs appearing 2+ times)
  const tagOptions = useMemo(() => {
    if (!directions) return [];
    const tagCount = new Map<string, { tag: Tag; count: number }>();

    for (const dir of directions) {
      const allTags = [...(dir.from_tags || []), ...(dir.to_tags || [])];
      for (const tag of allTags) {
        const key = String(tag.id);
        const existing = tagCount.get(key);
        if (existing) {
          existing.count++;
        } else {
          tagCount.set(key, { tag, count: 1 });
        }
      }
    }

    return Array.from(tagCount.values())
      .filter((v) => v.count >= 2)
      .sort((a, b) => (a.tag.sort_order ?? 99) - (b.tag.sort_order ?? 99))
      .map((v) => v.tag);
  }, [directions]);

  // Filter directions by selected tag
  const filteredDirections = useMemo(() => {
    if (!directions) return [];
    if (selectedTag === "all") return directions;
    const tagId = Number(selectedTag);
    return directions.filter((dir) => {
      const allTags = [...(dir.from_tags || []), ...(dir.to_tags || [])];
      return allTags.some((t) => t.id === tagId);
    });
  }, [directions, selectedTag]);

  // Split into favorites and popular
  const favs = favDirections || [];
  const favoriteDirections = filteredDirections.filter((d) =>
    isFavoriteDirection(favs, d.from_currency, d.to_currency),
  );
  const popularDirections = filteredDirections.filter(
    (d) => !isFavoriteDirection(favs, d.from_currency, d.to_currency),
  );

  async function handleToggleFavorite(dir: PopularDirection) {
    const added = await toggleFavoriteDirection(
      dir.from_currency,
      dir.to_currency,
    );
    await showToast({
      style: Toast.Style.Success,
      title: added ? "Added to favorites" : "Removed from favorites",
    });
    revalidateFavs();
  }

  function renderItem(dir: PopularDirection, isFav: boolean) {
    const fromName = dir.from_name_en || dir.from_currency;
    const toName = dir.to_name_en || dir.to_currency;
    const rateText = formatListRate(
      dir.rate_in,
      dir.rate_out,
      dir.from_currency_name,
      dir.to_currency_name,
    );

    return (
      <List.Item
        key={`${dir.from_currency}-${dir.to_currency}`}
        icon={currencyIcon(dir.from_icon_img)}
        title={`${fromName} → ${toName}`}
        subtitle={rateText}
        accessories={[
          ...(dir.exchanger_count
            ? [
                {
                  text: `${dir.exchanger_count} exchangers`,
                  tooltip: `Best rate from ${dir.exchanger_count} exchangers`,
                },
              ]
            : []),
          ...(isFav
            ? [
                {
                  icon: { source: Icon.Heart, tintColor: Color.Red },
                  tooltip: "Favorite",
                },
              ]
            : []),
          { icon: currencyIcon(dir.to_icon_img) },
        ]}
        keywords={
          [
            dir.from_currency,
            dir.to_currency,
            dir.from_name_en,
            dir.to_name_en,
            dir.from_currency_name,
            dir.to_currency_name,
          ].filter(Boolean) as string[]
        }
        actions={
          <ActionPanel>
            <Action.Push
              title="Rates"
              icon={Icon.List}
              target={
                <DirectionView from={dir.from_currency} to={dir.to_currency} />
              }
            />
            <Action.OpenInBrowser
              title="Open in Browser"
              url={directionUrl(dir.from_currency, dir.to_currency)}
            />
            <Action.CopyToClipboard title="Copy Rate" content={rateText} />
            <Action
              title={isFav ? "Remove from Favorites" : "Add to Favorites"}
              icon={isFav ? Icon.HeartDisabled : Icon.Heart}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={() => handleToggleFavorite(dir)}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search directions..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by tag"
          value={selectedTag}
          onChange={setSelectedTag}
        >
          <List.Dropdown.Item title="All" value="all" />
          {tagOptions.map((tag) => (
            <List.Dropdown.Item
              key={String(tag.id)}
              title={tag.name_en}
              value={String(tag.id)}
            />
          ))}
        </List.Dropdown>
      }
    >
      {error && !isLoading ? (
        <List.EmptyView
          title="Could not load directions"
          description={
            error instanceof Error
              ? error.message
              : "Please try refreshing the command."
          }
          icon={Icon.XMarkCircle}
        />
      ) : null}
      {favoriteDirections.length > 0 && (
        <List.Section title="Favorites">
          {favoriteDirections.map((dir) => renderItem(dir, true))}
        </List.Section>
      )}
      <List.Section title="Popular">
        {popularDirections.map((dir) => renderItem(dir, false))}
      </List.Section>
    </List>
  );
}
