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
import { getLocale, getLocalizedName, t } from "../utils/locale";
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
  const locale = getLocale();
  const {
    data: directions,
    isLoading,
    revalidate,
  } = usePopularDirections(locale);
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
    const fromName = getLocalizedName(dir, locale, "from_name");
    const toName = getLocalizedName(dir, locale, "to_name");
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
                  text: `${dir.exchanger_count} ${t("exchangers", locale)}`,
                  tooltip: `${t("bestRate", locale)} ${t("from", locale).toLowerCase()} ${dir.exchanger_count} ${t("exchangers", locale)}`,
                },
              ]
            : []),
          ...(isFav
            ? [
                {
                  icon: { source: Icon.Heart, tintColor: Color.Red },
                  tooltip: t("favorites", locale),
                },
              ]
            : []),
          { icon: currencyIcon(dir.to_icon_img) },
        ]}
        keywords={[
          dir.from_currency,
          dir.to_currency,
          dir.from_name_uk,
          dir.from_name_ru,
          dir.from_name_en,
          dir.to_name_uk,
          dir.to_name_ru,
          dir.to_name_en,
          dir.from_currency_name,
          dir.to_currency_name,
        ]}
        actions={
          <ActionPanel>
            <Action.Push
              title={t("rate", locale)}
              icon={Icon.List}
              target={
                <DirectionView from={dir.from_currency} to={dir.to_currency} />
              }
            />
            <Action.OpenInBrowser
              title={t("openInBrowser", locale)}
              url={directionUrl(dir.from_currency, dir.to_currency, locale)}
            />
            <Action.CopyToClipboard
              title={t("copyRate", locale)}
              content={rateText}
            />
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
      searchBarPlaceholder={t("searchDirections", locale)}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by tag"
          value={selectedTag}
          onChange={setSelectedTag}
        >
          <List.Dropdown.Item title={t("all", locale)} value="all" />
          {tagOptions.map((tag) => (
            <List.Dropdown.Item
              key={String(tag.id)}
              title={getLocalizedName(tag, locale)}
              value={String(tag.id)}
            />
          ))}
        </List.Dropdown>
      }
    >
      {favoriteDirections.length > 0 && (
        <List.Section title={t("favorites", locale)}>
          {favoriteDirections.map((dir) => renderItem(dir, true))}
        </List.Section>
      )}
      <List.Section title={t("popular", locale)}>
        {popularDirections.map((dir) => renderItem(dir, false))}
      </List.Section>
    </List>
  );
}
