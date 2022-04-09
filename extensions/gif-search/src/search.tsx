import { useEffect, useReducer } from "react";

import { List, showToast, Toast } from "@raycast/api";

import { ServiceName, getShowPreview } from "./preferences";

import AppContext, { initialState, reduceAppState } from "./components/AppContext";
import { GifList } from "./components/GifList";
import { FavesList } from "./components/FavesList";

import useFavorites from "./hooks/useFavorites";
import useSearchAPI from "./hooks/useSearchAPI";

import "./fetch-polyfill";

export default function Command() {
  const showPreview = getShowPreview();

  const [results, isLoading, setSearchService, setSearchTerm, searchTerm, serviceName] = useSearchAPI({});
  const [favIds, favItems, isFavsLoading, loadFavs, populate] = useFavorites({});

  const onServiceChange = (service: string) => {
    setSearchService(service as ServiceName);
    setSearchTerm(searchTerm);
  };

  const [state, dispatch] = useReducer(reduceAppState, initialState);

  useEffect(() => {
    if (serviceName) {
      loadFavs(serviceName);
    }
  }, [loadFavs, serviceName]);

  useEffect(() => {
    if (favIds?.ids && serviceName) {
      dispatch({ type: "add", ids: [...favIds?.ids], service: serviceName });
    }
  }, [favIds, serviceName]);

  useEffect(() => {
    if (state.favIds && serviceName) {
      populate(state.favIds, serviceName);
    }
  }, [state, serviceName]);

  useEffect(() => {
    if (results?.error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed loading gifs",
        message: results?.error.message,
      });
    }
  }, [results?.error]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <List
        searchBarAccessory={
          <List.Dropdown tooltip="" storeValue={true} onChange={onServiceChange}>
            <List.Dropdown.Item title="Giphy" value="giphy" />
            <List.Dropdown.Item title="Tenor" value="tenor" />
            <List.Dropdown.Item title="Finer Gifs Club" value="finergifs" />
          </List.Dropdown>
        }
        enableFiltering={false}
        isLoading={isLoading || isFavsLoading}
        throttle={true}
        searchBarPlaceholder="Search for gifs..."
        onSearchTextChange={setSearchTerm}
        isShowingDetail={showPreview && (results?.items?.length ?? 0) + (favItems?.items?.length ?? 0) != 0}
      >
        <FavesList results={favItems?.items} show={!!favItems?.items?.length && !results?.term} />
        <GifList term={results?.term} results={results?.items} />
      </List>
    </AppContext.Provider>
  );
}
