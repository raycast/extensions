import { useEffect, useReducer, useState } from "react";

import { showToast, Toast, Icon } from "@raycast/api";

import { ServiceName, getShowPreview, getMaxResults, GIF_SERVICE, getServiceTitle } from "../preferences";

import AppContext, { initialState, reduceAppState } from "./AppContext";

import useFavorites from "../hooks/useFavorites";
import useSearchAPI from "../hooks/useSearchAPI";
import { GifSearchList } from "./GifSearchList";

export function GifSearch() {
  const showPreview = getShowPreview();

  const [searchService, setSearchService] = useState<ServiceName>();
  const [results, isLoading, setSearchTerm, searchTerm, search] = useSearchAPI({ limit: getMaxResults() });

  const onServiceChange = (service: string) => {
    setSearchService(service as ServiceName);
    setSearchTerm(searchTerm);
  };

  // Perform initial GIF API search
  useEffect(() => {
    if (!searchService) {
      return;
    }

    search(searchTerm, searchService);
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

  const [favIds, favItems, isLoadingFavIds, isLoadingFavs, loadFavs, populate, loadAllFavs, populateAll] = useFavorites(
    {}
  );
  const [state, dispatch] = useReducer(reduceAppState, initialState);

  const showAllFavs = () => searchService === GIF_SERVICE.FAVORITES;

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
  }, [loadFavs, loadAllFavs, searchService]);

  // Hydrate global state with fav GIF id's
  useEffect(() => {
    if (isLoadingFavIds) {
      return;
    }

    dispatch({ type: "replace", ids: favIds?.ids, service: searchService });
  }, [isLoadingFavIds, dispatch]);

  // Populate favorite gifs from GIF API service using saved GIF ID's
  useEffect(() => {
    if (showAllFavs()) {
      populateAll(state.favIds || new Map<ServiceName, Set<string>>());
    } else {
      populate(state.favIds?.get(searchService as ServiceName) || new Set(), searchService);
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
  }, [favIds?.error, favItems?.errors]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {showAllFavs() ? (
        <GifSearchList
          isLoading={isLoadingFavIds || isLoadingFavs}
          showDropdown={true}
          showDetail={showPreview && (favItems?.items?.size ?? 0) !== 0}
          showEmpty={!favItems?.items?.size && !results?.term}
          onDropdownChange={onServiceChange}
          enableFiltering={true}
          searchBarPlaceholder="Search favorites..."
          emptyStateText="Add some GIFs to your Favorites first!"
          emptyStateIcon={Icon.Star}
          sections={Array.from(favItems?.items || []).map(([service, gifs]) => {
            return { title: getServiceTitle(service), results: gifs, service };
          })}
        />
      ) : (
        <GifSearchList
          isLoading={isLoading || isLoadingFavIds || isLoadingFavs}
          showDropdown={true}
          showDetail={showPreview && (results?.items?.length ?? 0) + (favItems?.items?.size ?? 0) != 0}
          showEmpty={!favItems?.items?.size && !results?.term && !results?.items?.length}
          searchBarPlaceholder="Search for gifs..."
          emptyStateText="Enter a search above to get started..."
          emptyStateIcon={Icon.MagnifyingGlass}
          onDropdownChange={onServiceChange}
          onSearchTextChange={setSearchTerm}
          sections={[
            {
              title: "Favorites",
              results: favItems?.items?.get(searchService as ServiceName),
              service: searchService,
              hide: !favItems?.items || !!results?.term,
            },
            { title: "Trending", term: results?.term, results: results?.items, service: searchService },
          ]}
        />
      )}
    </AppContext.Provider>
  );
}
