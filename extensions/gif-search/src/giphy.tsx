import { useEffect, useReducer } from "react";
import { List, showToast, Toast } from "@raycast/api";

import { getShowPreview, GIF_SERVICE } from "./preferences";

import AppContext, { initialState, reduceAppState } from "./components/AppContext";
import { GifList } from "./components/GifList";
import { FavesList } from "./components/FavesList";

import useSearchAPI from "./hooks/useSearchAPI";
import useFavorites from "./hooks/useFavorites";

import "./fetch-polyfill";

export default function Command() {
  const serviceName = GIF_SERVICE.GIPHY;
  const showPreview = getShowPreview();

  const [results, isLoading, setSearchService, setSearchTerm] = useSearchAPI({});
  const [favIds, favItems, isFavsLoading, loadFavs, populate] = useFavorites({});

  const [state, dispatch] = useReducer(reduceAppState, initialState);

  useEffect(() => {
    setSearchService(serviceName);
    loadFavs(serviceName);
  }, [loadFavs]);

  useEffect(() => {
    if (favIds?.ids) {
      dispatch({ type: "set", ids: favIds?.ids, service: serviceName });
    }
  }, [favIds]);

  useEffect(() => {
    if (state.favIds) {
      populate(state.favIds, serviceName);
    }
  }, [state]);

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
        isLoading={isLoading || isFavsLoading}
        throttle={true}
        searchBarPlaceholder="Search for gifs on Giphy..."
        onSearchTextChange={setSearchTerm}
        isShowingDetail={showPreview && (results?.items?.length ?? 0) + (favItems?.items?.length ?? 0) != 0}
      >
        <FavesList results={favItems?.items} show={!!favItems?.items?.length && !results?.term} />
        <GifList term={results?.term} results={results?.items} />
      </List>
    </AppContext.Provider>
  );
}
