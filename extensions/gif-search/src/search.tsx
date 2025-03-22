import "./fetch-polyfill";

import { useState } from "react";
import { useCachedState } from "@raycast/utils";

import { Color, Grid, Icon } from "@raycast/api";

import {
  ServiceName,
  getMaxResults,
  getServiceTitle,
  getGridItemSize,
  getGridTrendingItemSize,
  GIF_SERVICE,
  GRID_COLUMNS,
} from "./preferences";

import useSearchAPI from "./hooks/useSearchAPI";
import useLocalGifs from "./hooks/useLocalGifs";

import { GifGridSection } from "./components/GifGridSection";

export default function GifSearch() {
  const limit = getMaxResults();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchService, setSearchService] = useCachedState<ServiceName>("service", GIF_SERVICE.GIPHY);

  const itemSize = searchTerm.length > 0 ? getGridItemSize() : getGridTrendingItemSize();

  const { data: results, isLoading, pagination } = useSearchAPI({ term: searchTerm, service: searchService, limit });
  const {
    recentGifs,
    favoriteGifs,
    allGifs,
    isLoading: isLoadingLocalGifs,
    mutate,
  } = useLocalGifs(searchService, itemSize);

  const onServiceChange = (service: string) => {
    setSearchService(service as ServiceName);
    setSearchTerm(searchTerm);
  };

  const showAllFavs = searchService === GIF_SERVICE.FAVORITES;
  const showAllRecents = searchService === GIF_SERVICE.RECENTS;

  let placeholder = `Search for GIFs${searchService ? ` on ${getServiceTitle(searchService)}` : ""}`;
  if (showAllFavs) placeholder = "Search favorites";
  if (showAllRecents) placeholder = "Search recents";

  let emptyState = { text: "Enter a search above to get started…", icon: Icon.MagnifyingGlass };
  if (showAllFavs) emptyState = { text: "Add some GIFs to your Favorites first…", icon: Icon.Clock };
  if (showAllRecents) emptyState = { text: "Work with some GIFs first…", icon: Icon.Clock };
  if (searchTerm.length > 0 && results?.length === 0) emptyState = { text: "No GIFs were found.", icon: Icon.Image };

  let sections = [
    ...(searchTerm.length === 0
      ? [
          { title: "Favorites", results: favoriteGifs, isLocalGifSection: true },
          { title: "Recent", results: recentGifs, isLocalGifSection: true },
        ]
      : []),
    { title: "Trending", results },
  ];

  const showLocalGifsView = showAllFavs || showAllRecents;

  if (showLocalGifsView) {
    sections =
      allGifs?.map(([service, gifs]) => {
        return { title: getServiceTitle(service), results: gifs, isLocalGifSection: true };
      }) ?? [];
  }

  const columns = GRID_COLUMNS[itemSize];

  return (
    <Grid
      columns={columns}
      pagination={showLocalGifsView ? undefined : pagination}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Change GIF Provider" onChange={onServiceChange} value={searchService}>
          <Grid.Dropdown.Section>
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
              title="Tenor"
              value={GIF_SERVICE.TENOR}
              icon={{ source: "tenor-logo-square-180.png" }}
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
      isLoading={isLoading || isLoadingLocalGifs}
      throttle
      searchBarPlaceholder={placeholder}
      onSearchTextChange={setSearchTerm}
    >
      <Grid.EmptyView title={emptyState.text} icon={emptyState.icon} />
      {sections.map((section) => (
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
