import { useEffect, useReducer, useState } from "react";

import { List, showToast, Toast } from "@raycast/api";

import { ServiceName, getShowPreview } from "../preferences";

import AppContext, { initialState, reduceAppState } from "./AppContext";
import { GifList } from "./GifList";
import { FavesList } from "./FavesList";

import useFavorites from "../hooks/useFavorites";
import useSearchAPI from "../hooks/useSearchAPI";

export function GifSearch(props: { service?: ServiceName }) {
  const showServiceDropdown = !props.service;
  const showPreview = getShowPreview();

  const [searchService, setSearchService] = useState(props.service);
  const [results, isLoading, setSearchTerm, searchTerm, search, markfavs] = useSearchAPI({});

  const onServiceChange = (service: string) => {
    setSearchService(service as ServiceName);
    setSearchTerm(searchTerm);
  };

  // Perform initial GIF API search
  useEffect(() => {
    if (searchService) {
      search(searchTerm, searchService);
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

  const [favIds, favItems, isFavsLoading, loadFavs, populate] = useFavorites({});
  const [state, dispatch] = useReducer(reduceAppState, initialState);

  const shouldShowDetails = () => showPreview && (results?.items?.length ?? 0) + (favItems?.items?.length ?? 0) != 0;
  const shouldShowFavs = () => !!favItems?.items?.length && !results?.term;

  // Load saved favorite GIF id's from LocalStorage
  useEffect(() => {
    if (searchService) {
      loadFavs(searchService);
    }
  }, [loadFavs, searchService]);

  // Hydrate global state with fav GIF id's
  useEffect(() => {
    if (favIds?.ids && searchService) {
      dispatch({ type: "add", ids: [...favIds?.ids], service: searchService });
    }
  }, [favIds, searchService]);

  // Populate favorite gifs from GIF API service using saved GIF ID's
  useEffect(() => {
    if (state.favIds && searchService) {
      populate(state.favIds, searchService);
    }
  }, [state, searchService]);

  // Update fav status of GIF results
  useEffect(() => {
    if (results?.items?.length && state.favIds) {
      markfavs(results, state.favIds);
    }
  }, [isLoading, state, searchService]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <List
        searchBarAccessory={
          showServiceDropdown && (
            <List.Dropdown tooltip="" storeValue={true} onChange={onServiceChange}>
              <List.Dropdown.Item title="Giphy" value="giphy" />
              <List.Dropdown.Item title="Tenor" value="tenor" />
              <List.Dropdown.Item title="Finer Gifs Club" value="finergifs" />
            </List.Dropdown>
          )
        }
        enableFiltering={false}
        isLoading={isLoading || isFavsLoading}
        throttle={true}
        searchBarPlaceholder="Search for gifs..."
        onSearchTextChange={setSearchTerm}
        isShowingDetail={shouldShowDetails()}
      >
        <FavesList results={favItems?.items} show={shouldShowFavs()} />
        <GifList term={results?.term} results={results?.items} />
      </List>
    </AppContext.Provider>
  );
}
