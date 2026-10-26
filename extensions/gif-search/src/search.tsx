import { useCallback, useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";

import { Color, Grid, Icon, showToast, Toast } from "@raycast/api";

import {
  getAllSourcesServices,
  getMaxResults,
  getServiceTitle,
  getGridItemSize,
  getGridTrendingItemSize,
  GIF_SERVICE,
  GRID_COLUMNS,
  isServiceName,
  ServiceName,
} from "./preferences";

import useSearchAPI from "./hooks/useSearchAPI";
import useLocalGifs from "./hooks/useLocalGifs";

import { GifGridSection } from "./components/GifGridSection";
import { SourceSection, SourceState } from "./components/SourceSection";

export default function GifSearch() {
  const limit = getMaxResults();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [cachedSearchService, setSearchService] = useCachedState<string>("service", GIF_SERVICE.GIPHY);
  const searchService = isServiceName(cachedSearchService) ? cachedSearchService : GIF_SERVICE.GIPHY;

  const itemSize = searchTerm.length > 0 ? getGridItemSize() : getGridTrendingItemSize();
  const columns = GRID_COLUMNS[itemSize];

  const isAllSources = searchService === GIF_SERVICE.ALL;
  const providerService = isAllSources ? undefined : searchService;

  const {
    data: results,
    error,
    isLoading,
    pagination,
  } = useSearchAPI({ term: searchTerm, service: providerService, limit });
  const {
    recentGifs,
    favoriteGifs,
    allGifs,
    isLoading: isLoadingLocalGifs,
    mutate,
  } = useLocalGifs(providerService, itemSize);

  const allSources = getAllSourcesServices();
  const perSourceLimit = Math.min(limit, columns * 2);
  const [sourceStates, setSourceStates] = useState<Partial<Record<ServiceName, SourceState>>>({});
  const onSourceStateChange = useCallback((service: ServiceName, state: SourceState) => {
    setSourceStates((previous) => ({ ...previous, [service]: state }));
  }, []);

  // A source that hasn't reported yet counts as loading, so the empty state doesn't flash.
  const isLoadingAllSources = isAllSources && allSources.some((service) => sourceStates[service]?.isLoading ?? true);
  const allSourcesEmpty = isAllSources && allSources.every((service) => sourceStates[service]?.count === 0);
  const failedSources = isAllSources ? allSources.filter((service) => sourceStates[service]?.error) : [];
  const failedSourcesKey = failedSources.join(",");

  const onServiceChange = (service: string) => {
    if (isServiceName(service)) setSearchService(service);
    setSearchTerm(searchTerm);
  };

  const showAllFavs = searchService === GIF_SERVICE.FAVORITES;
  const showAllRecents = searchService === GIF_SERVICE.RECENTS;
  const showProviderError = Boolean(error && !results?.length && !showAllFavs && !showAllRecents);

  useEffect(() => {
    if (!error || showAllFavs || showAllRecents) {
      return;
    }

    showToast({
      style: Toast.Style.Failure,
      title: `Could not load GIFs from ${getServiceTitle(searchService)}`,
      message: error.message,
    });
  }, [error, searchService, showAllFavs, showAllRecents]);

  useEffect(() => {
    if (!failedSources.length) {
      return;
    }

    showToast({
      style: Toast.Style.Failure,
      title: `Could not load GIFs from ${failedSources.map(getServiceTitle).join(", ")}`,
      message: sourceStates[failedSources[0]]?.error?.message,
    });
  }, [failedSourcesKey]);

  let placeholder = `Search for GIFs${searchService ? ` on ${getServiceTitle(searchService)}` : ""}`;
  if (showAllFavs) placeholder = "Search favorites";
  if (showAllRecents) placeholder = "Search recents";
  if (isAllSources) placeholder = "Search GIFs across all sources";

  let emptyState = { text: "Enter a search above to get started…", icon: Icon.MagnifyingGlass };
  if (showAllFavs) emptyState = { text: "Add some GIFs to your Favorites first…", icon: Icon.Clock };
  if (showAllRecents) emptyState = { text: "Work with some GIFs first…", icon: Icon.Clock };
  if (!isAllSources && searchTerm.length > 0 && results?.length === 0) {
    emptyState = { text: "No GIFs were found.", icon: Icon.Image };
  }
  if (showProviderError) emptyState = { text: error?.message ?? "Could not load GIFs.", icon: Icon.Image };
  if (isAllSources && searchTerm.length > 0 && !isLoadingAllSources && allSourcesEmpty) {
    emptyState = { text: "No GIFs were found.", icon: Icon.Image };
  }

  let sections = [
    ...(searchTerm.length === 0
      ? [
          { title: "Favorites", results: favoriteGifs, isLocalGifSection: true },
          { title: "Recent", results: recentGifs, isLocalGifSection: true },
        ]
      : []),
    { title: "Trending", results: showProviderError ? [] : results },
  ];

  const showLocalGifsView = showAllFavs || showAllRecents;

  if (showLocalGifsView) {
    sections =
      allGifs?.map(([service, gifs]) => {
        return { title: getServiceTitle(service), results: gifs, isLocalGifSection: true };
      }) ?? [];
  }

  return (
    <Grid
      columns={columns}
      pagination={showLocalGifsView || isAllSources ? undefined : pagination}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Change GIF Provider" onChange={onServiceChange} value={searchService}>
          <Grid.Dropdown.Section>
            <Grid.Dropdown.Item title="All Sources" value={GIF_SERVICE.ALL} icon={{ source: Icon.AppWindowGrid3x3 }} />
            <Grid.Dropdown.Item
              title="GIPHY GIFs"
              value={GIF_SERVICE.GIPHY}
              icon={{ source: "giphy-logo-square-180.png" }}
            />
            <Grid.Dropdown.Item
              title="GIPHY Clips"
              value={GIF_SERVICE.GIPHY_CLIPS}
              icon={{ source: "giphy-logo-square-180.png" }}
            />
            <Grid.Dropdown.Item
              title="GIPHY Stickers"
              value={GIF_SERVICE.GIPHY_STICKERS}
              icon={{ source: "giphy-logo-square-180.png" }}
            />
            <Grid.Dropdown.Item
              title="Klipy"
              value={GIF_SERVICE.KLIPY}
              icon={{ source: "klipy-logo-square-180.png" }}
            />
            <Grid.Dropdown.Item
              title="Finer Gifs Club"
              value={GIF_SERVICE.FINER_GIFS}
              icon={{ source: "finergifs-logo.svg", tintColor: Color.PrimaryText }}
            />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section>
            <Grid.Dropdown.Item
              title="Favorites"
              value={GIF_SERVICE.FAVORITES}
              icon={{ source: Icon.Star, tintColor: Color.Yellow }}
            />
            <Grid.Dropdown.Item title="Recent" value={GIF_SERVICE.RECENTS} icon={{ source: Icon.Clock }} />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
      filtering={showAllFavs || showAllRecents}
      isLoading={isLoading || isLoadingLocalGifs || isLoadingAllSources}
      throttle
      searchBarPlaceholder={placeholder}
      onSearchTextChange={setSearchTerm}
    >
      <Grid.EmptyView title={emptyState.text} icon={emptyState.icon} />
      {isAllSources
        ? allSources.map((service) => (
            <SourceSection
              key={service}
              service={service}
              term={searchTerm}
              limit={perSourceLimit}
              onStateChange={onSourceStateChange}
              mutate={mutate}
            />
          ))
        : sections.map((section) => (
            <GifGridSection
              key={section.title}
              title={section.title}
              results={section.results ?? []}
              isLocalGifSection={section.isLocalGifSection}
              term={searchTerm}
              service={searchService}
              mutate={mutate}
            />
          ))}
    </Grid>
  );
}
