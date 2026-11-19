import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { SettingsAction } from "./components/selection-actions";
import { SkyGridItem } from "./components/sky-grid-item";
import { messageFor } from "./lib/command-ui";
import { favoriteId, getDefaultSelection, searchCities, useLocations } from "./lib/locations";
import { getCities } from "./lib/skyfrom-api";
import { now } from "./lib/time";

const pageSize = 9;

export default function ExploreSky() {
  const [search, setSearch] = useState({ query: "", limit: pageSize });
  const locations = useLocations();
  const { favorites, recent: recentCities, defaultCity, defaultFavorite } = locations;
  const catalog = usePromise(getCities, [], { onError: () => undefined });
  const defaults = usePromise(getDefaultSelection, [{ state: { favorites, defaultCity, defaultFavorite } }], {
    execute: !locations.isLoading,
    onError: () => undefined,
  });
  const defaultSky = defaults.data;

  const query = search.query.trim();
  const matching = query ? searchCities(catalog.data ?? [], query) : [];
  const savedIds = new Set(favorites.map(({ id }) => id));
  const favoriteItems = favorites
    .slice(0, 6)
    .map((favorite) => <SkyGridItem key={favorite.id} selection={favorite} title={favorite.name} isFavorite />);
  const existingNow = new Set([defaultSky && favoriteId(defaultSky), ...favorites.slice(0, 6).map(favoriteId)]);
  const recent = recentCities.filter((city) => !existingNow.has(favoriteId({ city, time: now }))).slice(0, 6);
  const failure = query ? catalog.error : (locations.error ?? defaults.error ?? catalog.error);
  const error = failure ? messageFor(failure) : undefined;
  const loading = catalog.isLoading || (!query && (locations.isLoading || defaults.isLoading));
  return (
    <Grid
      searchBarPlaceholder="Search for a city…"
      columns={3}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      filtering={false}
      throttle
      isLoading={loading}
      onSearchTextChange={(query) => setSearch({ query, limit: pageSize })}
      pagination={
        query && !loading
          ? {
              onLoadMore: () => setSearch((current) => ({ ...current, limit: current.limit + pageSize })),
              hasMore: matching.length > search.limit,
              pageSize,
            }
          : undefined
      }
    >
      {query ? (
        <Grid.Section title="Search Results">
          {matching.slice(0, search.limit).map((city) => (
            <SkyGridItem
              key={city.slug}
              selection={{ city, time: now }}
              isFavorite={savedIds.has(favoriteId({ city, time: now }))}
            />
          ))}
        </Grid.Section>
      ) : (
        <>
          {defaultSky ? (
            <Grid.Section title="My Location">
              <SkyGridItem
                key={favoriteId(defaultSky)}
                selection={defaultSky}
                isFavorite={savedIds.has(favoriteId(defaultSky))}
              />
            </Grid.Section>
          ) : null}
          {favoriteItems.length > 0 ? <Grid.Section title="Favorites">{favoriteItems}</Grid.Section> : null}
          {recent.length > 0 ? (
            <Grid.Section title="Recently Viewed">
              {recent.map((city) => (
                <SkyGridItem
                  key={city.slug}
                  selection={{ city, time: now }}
                  isFavorite={savedIds.has(favoriteId({ city, time: now }))}
                />
              ))}
            </Grid.Section>
          ) : null}
        </>
      )}
      {!loading ? (
        <Grid.EmptyView
          icon={error ? Icon.ExclamationMark : Icon.MagnifyingGlass}
          title={error ? "Couldn’t Load Cities" : query ? "No Cities Found" : "Find a City"}
          description={
            error ?? (query ? "Check the spelling or try a nearby city." : "Search for a city to see its sky gradient.")
          }
          actions={
            <ActionPanel>
              {catalog.error || defaults.error ? (
                <Action
                  title="Try Again"
                  icon={Icon.ArrowClockwise}
                  onAction={() => {
                    if (catalog.error) catalog.revalidate();
                    if (defaults.error) defaults.revalidate();
                  }}
                />
              ) : null}
              <SettingsAction />
            </ActionPanel>
          }
        />
      ) : null}
    </Grid>
  );
}
