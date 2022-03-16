import { useEffect } from "react";
import { List, showToast, Toast } from "@raycast/api";

import { getShowPreview } from "./preferences";
import useFinerGifsClubAPI from "./hooks/useFinerGifsClubAPI";
import { GifList } from "./components/GifList";

import "./fetch-polyfill";

export default function Command() {
  const showPreview = getShowPreview();
  const [results, isLoading, search] = useFinerGifsClubAPI({});

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
      searchBarPlaceholder="Search quotes from The Office on The Finer Gifs Club..."
      onSearchTextChange={search}
      isShowingDetail={showPreview && results?.items?.length != 0}
    >
      <GifList term={results?.term} results={results?.items} />
    </List>
  );
}
