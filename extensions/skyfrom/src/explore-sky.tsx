import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { SettingsAction } from "./components/selection-actions";
import { SkyGridItem } from "./components/sky-grid-item";
import { messageFor } from "./lib/command-ui";
import { favoriteId, getDefaultSelection, searchCities, SkySelection, useLocations } from "./lib/locations";
import { City, getCities } from "./lib/skyfrom-api";
import { now } from "./lib/time";

const pageSize = 9;

export default function ExploreSky() {
  const [search, setSearch] = useState({ query: "", limit: pageSize });
  const [catalog, setCatalog] = useState<{ cities: City[]; error?: string }>();
  const [defaultSky, setDefaultSky] = useState<SkySelection>();
  const [defaultError, setDefaultError] = useState<string>();
  const [reload, setReload] = useState(0);
  const locations = useLocations();

  useEffect(() => {
    let active = true;
    getCities().then(
      (cities) => {
        if (active) setCatalog({ cities });
      },
      (error: unknown) => {
        if (active) setCatalog({ cities: [], error: messageFor(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [reload]);

  const { defaultCity, defaultFavorite, favorites } = locations;
  useEffect(() => {
    let active = true;
    getDefaultSelection().then(
      (defaultSky) => {
        if (!active) return;
        setDefaultSky(defaultSky);
        setDefaultError(undefined);
      },
      (error: unknown) => {
        if (!active) return;
        setDefaultSky(undefined);
        setDefaultError(messageFor(error));
      },
    );
    return () => {
      active = false;
    };
  }, [reload, defaultCity, defaultFavorite, favorites]);

  const query = search.query.trim();
  const matching = query ? searchCities(catalog?.cities ?? [], query) : [];
  const savedIds = new Set(favorites.map(({ id }) => id));
  const favoriteItems = favorites
    .slice(0, 6)
    .map((favorite) => <SkyGridItem key={favorite.id} selection={favorite} title={favorite.name} isFavorite />);
  const existingNow = new Set([defaultSky && favoriteId(defaultSky), ...favorites.slice(0, 6).map(favoriteId)]);
  const recent = locations.recent.filter((city) => !existingNow.has(favoriteId({ city, time: now }))).slice(0, 6);
  const error =
    catalog?.error ??
    (locations.error ? messageFor(locations.error) : undefined) ??
    (!query ? defaultError : undefined);
  const loading = !catalog || (!query && locations.isLoading);
  return (
    <Grid
      navigationTitle="Explore Sky"
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
              {error ? (
                <Action
                  title="Try Again"
                  icon={Icon.ArrowClockwise}
                  onAction={() => {
                    setCatalog(undefined);
                    setReload((value) => value + 1);
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
