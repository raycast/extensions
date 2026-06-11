import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { currencyIcon } from "../utils/icon";
import { formatListRate } from "../utils/format";
import { directionUrl } from "../utils/url";
import { fetchPopularDirections } from "../api/client";
import {
  toggleFavoriteDirection,
  isFavoriteDirection,
} from "../utils/favorites";
import { useFavoriteDirections } from "../hooks/useFavorites";
import type { PopularDirection } from "../api/types";
import DirectionView from "./direction";

export default function QuickSearch() {
  const {
    data: directions,
    isLoading,
    error,
  } = useCachedPromise(fetchPopularDirections, [100], {
    keepPreviousData: true,
  });
  const { data: favDirections, revalidate: revalidateFavs } =
    useFavoriteDirections();
  const favs = favDirections || [];

  async function handleToggleFav(dir: PopularDirection) {
    const added = await toggleFavoriteDirection(
      dir.from_currency,
      dir.to_currency,
    );
    await showToast({
      style: Toast.Style.Success,
      title: added ? "★" : "☆",
    });
    revalidateFavs();
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="e.g.: usdt trc20 monobank"
      throttle
    >
      {error && !isLoading ? (
        <List.EmptyView
          title="Could not load exchange rates"
          description={
            error instanceof Error
              ? error.message
              : "Please try again in a moment."
          }
          icon={Icon.XMarkCircle}
        />
      ) : null}
      {(directions || []).map((dir) => {
        const fromName = dir.from_name_en || dir.from_currency;
        const toName = dir.to_name_en || dir.to_currency;
        const rateText = formatListRate(
          dir.rate_in,
          dir.rate_out,
          dir.from_currency_name,
          dir.to_currency_name,
        );
        const isFav = isFavoriteDirection(
          favs,
          dir.from_currency,
          dir.to_currency,
        );

        return (
          <List.Item
            key={`${dir.from_currency}-${dir.to_currency}`}
            icon={currencyIcon(dir.from_icon_img)}
            title={`${fromName} → ${toName}`}
            subtitle={rateText}
            accessories={[
              ...(dir.exchanger_count
                ? [{ text: `${dir.exchanger_count}` }]
                : []),
              ...(isFav
                ? [{ icon: { source: Icon.Heart, tintColor: Color.Red } }]
                : []),
              { icon: currencyIcon(dir.to_icon_img) },
            ]}
            keywords={[
              dir.from_currency,
              dir.to_currency,
              dir.from_name_en,
              dir.to_name_en,
              dir.from_currency_name,
              dir.to_currency_name,
              // Split compound names for partial matching
              ...dir.from_currency.split("-"),
              ...dir.to_currency.split("-"),
              ...dir.from_currency_name.split(" "),
              ...dir.to_currency_name.split(" "),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Rates"
                  icon={Icon.List}
                  target={
                    <DirectionView
                      from={dir.from_currency}
                      to={dir.to_currency}
                    />
                  }
                />
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={directionUrl(dir.from_currency, dir.to_currency)}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action
                  title={isFav ? "Remove Favorite" : "Add Favorite"}
                  icon={isFav ? Icon.HeartDisabled : Icon.Heart}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                  onAction={() => handleToggleFav(dir)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
