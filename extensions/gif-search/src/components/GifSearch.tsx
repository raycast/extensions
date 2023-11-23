import { useEffect, useReducer, useState } from "react";

import { showToast, Toast, Icon } from "@raycast/api";

import {
  ServiceName,
  getMaxResults,
  GIF_SERVICE,
  getServiceTitle,
  getGridItemSize,
  getGridTrendingItemSize,
} from "../preferences";

import AppContext, { initialState, reduceAppState } from "./AppContext";

import useLocalGifs from "../hooks/useLocalGifs";
import useSearchAPI from "../hooks/useSearchAPI";
import { GifGrid } from "./GifGrid";
import useGifPopulator, { GifIds } from "../hooks/useGifPopulator";

export function GifSearch() {
  const limit = getMaxResults();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchService, setSearchService] = useState<ServiceName>();
  const [results, isLoading, loadMore] = useSearchAPI({ term: searchTerm, service: searchService, limit });

  const [itemSize, setItemSize] = useState(getGridTrendingItemSize());

  const loadMoreGifs = () => {
    loadMore();
  };

  const onServiceChange = (service: string) => {
    setSearchService(service as ServiceName);
    setSearchTerm(searchTerm);
  };

  useEffect(() => {
    if (searchTerm) {
      setItemSize(getGridItemSize());
    } else {
      setItemSize(getGridTrendingItemSize());
    }
  }, [searchTerm, searchService]);

  // Display any GIF API search errors
  useEffect(() => {
    if (results?.error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed loading gifs",
        message: results?.error.message,
      });
    }
  }, [results?.error]);

  const [state, dispatch] = useReducer(reduceAppState, initialState);

  const [favIds, isLoadingFavIds, loadFavs, loadAllFavs] = useLocalGifs("favs");
  const [favItems, isLoadingFavs, populate, populateAll] = useGifPopulator();

  const [recentIds, isLoadingRecentIds, loadRecents, loadAllRecents] = useLocalGifs("recent");
  const [recentItems, isLoadingRecents, populateRecent, populateAllRecent] = useGifPopulator();

  const showAllFavs = () => searchService === GIF_SERVICE.FAVORITES;
  const showAllRecents = () => searchService === GIF_SERVICE.RECENTS;

  // Load saved favorite GIF id's from LocalStorage
  useEffect(() => {
    if (!searchService) {
      return;
    }

    if (showAllFavs()) {
      loadAllFavs();
    } else {
      loadFavs(searchService);
    }

    if (showAllRecents()) {
      loadAllRecents();
    } else {
      loadRecents(searchService);
    }
  }, [loadFavs, loadAllFavs, loadRecents, loadAllRecents, searchService]);

  // Hydrate global state with fav GIF id's
  useEffect(() => {
    if (!isLoadingFavIds) {
      dispatch({ type: "replace", favIds: favIds?.ids, service: searchService });
    }

    if (!isLoadingRecentIds) {
      dispatch({ type: "replace", recentIds: recentIds?.ids, service: searchService });
    }
  }, [isLoadingFavIds, isLoadingRecentIds, dispatch]);

  // Populate favorite gifs from GIF API service using saved GIF ID's
  useEffect(() => {
    if (showAllFavs()) {
      populateAll(state.favIds || new Map<ServiceName, GifIds>(), { reverse: true });
    } else {
      populate(state.favIds?.get(searchService as ServiceName) || new Set(), searchService, {
        limit: limit / 2,
        reverse: true,
      });
    }

    if (showAllRecents()) {
      populateAllRecent(state.recentIds || new Map<ServiceName, GifIds>(), { reverse: true });
    } else {
      populateRecent(state.recentIds?.get(searchService as ServiceName) || new Set(), searchService, {
        limit: limit / 2,
        reverse: true,
      });
    }
  }, [state]);

  useEffect(() => {
    if (favIds?.error || favItems?.errors) {
      const combinedErrorMessage = favItems?.errors?.map(({ message }) => message).join(". ");
      showToast({
        style: Toast.Style.Failure,
        title: "Failed loading favorites",
        message: favIds?.error?.message || combinedErrorMessage,
      });
    }

    if (recentIds?.error || recentItems?.errors) {
      const combinedErrorMessage = recentItems?.errors?.map(({ message }) => message).join(". ");
      showToast({
        style: Toast.Style.Failure,
        title: "Failed loading recent",
        message: recentIds?.error?.message || combinedErrorMessage,
      });
    }
  }, [favIds?.error, favItems?.errors, recentIds?.error, recentItems?.errors]);

  let grid: JSX.Element;
  if (showAllFavs()) {
    grid = (
      <GifGrid
        itemSize={itemSize}
        isLoading={isLoadingFavIds || isLoadingFavs}
        showDropdown={true}
        showDetail={(favItems?.items?.size ?? 0) !== 0}
        showEmpty={!favItems?.items?.size && !results?.term}
        onDropdownChange={onServiceChange}
        enableFiltering={true}
        searchBarPlaceholder="Search favorites..."
        emptyStateText="Add some GIFs to your Favorites first!"
        emptyStateIcon={Icon.Star}
        loadMoreGifs={loadMoreGifs}
        sections={Array.from(favItems?.items || []).map(([service, gifs]) => {
          return { title: getServiceTitle(service), results: gifs, service, isLocalGifSection: true };
        })}
      />
    );
  } else if (showAllRecents()) {
    grid = (
      <GifGrid
        itemSize={itemSize}
        isLoading={isLoadingRecentIds || isLoadingRecents}
        showDropdown={true}
        showDetail={(recentItems?.items?.size ?? 0) !== 0}
        showEmpty={!recentItems?.items?.size && !results?.term}
        onDropdownChange={onServiceChange}
        enableFiltering={true}
        searchBarPlaceholder="Search recents..."
        emptyStateText="Work with some GIFs first..."
        loadMoreGifs={loadMoreGifs}
        emptyStateIcon={Icon.Clock}
        sections={Array.from(recentItems?.items || []).map(([service, gifs]) => {
          return { title: getServiceTitle(service), results: gifs, service, isLocalGifSection: true };
        })}
      />
    );
  } else {
    grid = (
      <GifGrid
        itemSize={itemSize}
        isLoading={isLoading || isLoadingFavIds || isLoadingFavs || isLoadingRecents}
        showDropdown={true}
        showDetail={(results?.items?.length ?? 0) + (favItems?.items?.size ?? 0) != 0}
        showEmpty={!favItems?.items?.size && !results?.term && !results?.items?.length}
        searchBarPlaceholder={`Search for GIFs${searchService ? ` on ${getServiceTitle(searchService)}` : ""}...`}
        emptyStateText="Enter a search above to get started..."
        emptyStateIcon={Icon.MagnifyingGlass}
        onDropdownChange={onServiceChange}
        onSearchTextChange={setSearchTerm}
        loadMoreGifs={loadMoreGifs}
        sections={[
          {
            title: "Favorites",
            results: favItems?.items?.get(searchService as ServiceName),
            service: searchService,
            hide: !favItems?.items || !!results?.term,
            isLocalGifSection: true,
          },
          {
            title: "Recent",
            results: recentItems?.items?.get(searchService as ServiceName),
            service: searchService,
            hide: !recentItems?.items || !!results?.term,
            isLocalGifSection: true,
          },
          {
            title: "Trending",
            term: results?.term,
            results: results?.items,
            service: searchService,
          },
        ]}
      />
    );
  }

  return <AppContext.Provider value={{ state, dispatch }}>{grid}</AppContext.Provider>;
}
