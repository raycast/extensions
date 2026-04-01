import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
} from "@raycast/api";
import { useMemo } from "react";
import {
  useFavoriteDirections,
  useFavoriteExchangers,
} from "../hooks/useFavorites";
import { usePopularDirections } from "../hooks/usePopularDirections";
import { useExchangers } from "../hooks/useExchangers";
import { getLocale, getLocalizedName, t } from "../utils/locale";
import { currencyIcon } from "../utils/icon";
import { formatListRate } from "../utils/format";
import { directionUrl, exchangerUrl } from "../utils/url";
import {
  mapTrustColor,
  trustStatusName,
  trustStatusIcon,
} from "../utils/trustStatus";
import {
  toggleFavoriteDirection,
  toggleFavoriteExchanger,
  isFavoriteDirection,
} from "../utils/favorites";
import DirectionView from "./direction";

export default function Favorites() {
  const locale = getLocale();
  const { data: favDirs, revalidate: revalidateFavDirs } =
    useFavoriteDirections();
  const { data: favExchangerUrls, revalidate: revalidateFavEx } =
    useFavoriteExchangers();
  const { data: directions, isLoading: dirsLoading } =
    usePopularDirections(locale);
  const { data: exchangers, isLoading: exLoading } = useExchangers(locale);

  const favDirections = useMemo(() => {
    if (!favDirs || !directions) return [];
    return directions.filter((d) =>
      isFavoriteDirection(favDirs, d.from_currency, d.to_currency),
    );
  }, [favDirs, directions]);

  const favExchangerList = useMemo(() => {
    if (!favExchangerUrls || !exchangers) return [];
    return exchangers.filter((e) => favExchangerUrls.includes(e.internal_url));
  }, [favExchangerUrls, exchangers]);

  const isEmpty = favDirections.length === 0 && favExchangerList.length === 0;

  async function handleRemoveDirection(from: string, to: string) {
    await toggleFavoriteDirection(from, to);
    await showToast({
      style: Toast.Style.Success,
      title: "Removed from favorites",
    });
    revalidateFavDirs();
  }

  async function handleRemoveExchanger(internalUrl: string) {
    await toggleFavoriteExchanger(internalUrl);
    await showToast({
      style: Toast.Style.Success,
      title: "Removed from favorites",
    });
    revalidateFavEx();
  }

  return (
    <List
      isLoading={dirsLoading || exLoading}
      searchBarPlaceholder={t("searchDirections", locale)}
    >
      {isEmpty && !dirsLoading && !exLoading && (
        <List.EmptyView
          title={t("favorites", locale)}
          description="No favorites yet. Add directions or exchangers to favorites using ⌘+F."
          icon={Icon.Heart}
        />
      )}

      {favDirections.length > 0 && (
        <List.Section
          title={t("favorites", locale) + " — Directions"}
          subtitle={`${favDirections.length}`}
        >
          {favDirections.map((dir) => {
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
                        },
                      ]
                    : []),
                  {
                    icon: { source: Icon.Heart, tintColor: Color.Red },
                  },
                  { icon: currencyIcon(dir.to_icon_img) },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title={t("rate", locale)}
                      icon={Icon.List}
                      target={
                        <DirectionView
                          from={dir.from_currency}
                          to={dir.to_currency}
                        />
                      }
                    />
                    <Action.OpenInBrowser
                      title={t("openInBrowser", locale)}
                      url={directionUrl(
                        dir.from_currency,
                        dir.to_currency,
                        locale,
                      )}
                    />
                    <Action
                      title="Remove from Favorites"
                      icon={Icon.HeartDisabled}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                      onAction={() =>
                        handleRemoveDirection(
                          dir.from_currency,
                          dir.to_currency,
                        )
                      }
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {favExchangerList.length > 0 && (
        <List.Section
          title={t("favorites", locale) + " — Exchangers"}
          subtitle={`${favExchangerList.length}`}
        >
          {favExchangerList.map((ex) => {
            const trustLabel =
              ex.trust_status_label ||
              trustStatusName(ex.trust_status_css_class);
            const trustColor = mapTrustColor(ex.trust_status_css_class);
            const trustIcon = trustStatusIcon(ex.trust_status_css_class);

            return (
              <List.Item
                key={ex.internal_url}
                icon={
                  trustIcon || {
                    source: Icon.Circle,
                    tintColor: trustColor,
                  }
                }
                title={ex.name}
                subtitle={`★ ${ex.average_rating?.toFixed(1) ?? "—"} · ${ex.pairs_count} ${t("pairs", locale)}`}
                accessories={[
                  ...(trustLabel
                    ? [
                        {
                          tag: { value: trustLabel, color: trustColor },
                          icon: trustIcon,
                          tooltip: ex.trust_status_explanation || trustLabel,
                        },
                      ]
                    : []),
                  {
                    icon: { source: Icon.Heart, tintColor: Color.Red },
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title={t("openInBrowser", locale)}
                      url={exchangerUrl(ex.internal_url, locale)}
                    />
                    <Action
                      title="Remove from Favorites"
                      icon={Icon.HeartDisabled}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                      onAction={() => handleRemoveExchanger(ex.internal_url)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
