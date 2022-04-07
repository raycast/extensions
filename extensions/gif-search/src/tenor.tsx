import { useEffect } from "react";
import { List, showToast, Toast } from "@raycast/api";

import { getShowPreview, GIF_SERVICE } from "./preferences";
import { GifList } from "./components/GifList";
import useSearchAPI from "./hooks/useSearchAPI";

import "./fetch-polyfill";

export default function Command() {
  const showPreview = getShowPreview();
  const [results, isLoading, setSearchService, setSearchTerm] = useSearchAPI({});

  useEffect(() => {
    setSearchService(GIF_SERVICE.TENOR);
  }, []);

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
    <List
      isLoading={isLoading}
      throttle={true}
      searchBarPlaceholder="Search for gifs on Tenor..."
      onSearchTextChange={setSearchTerm}
      isShowingDetail={showPreview && results?.items?.length != 0}
    >
      <GifList term={results?.term} results={results?.items} />
    </List>
  );
}
