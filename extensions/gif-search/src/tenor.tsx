import { useEffect } from "react";
import { List, showToast, Toast } from "@raycast/api";

import useTenorAPI from "./hooks/useTenorAPI";
import { GifList } from "./components/GifList";

import "./fetch-polyfill";

export default function Command() {
  const [results, isLoading, search] = useTenorAPI({});

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
      onSearchTextChange={search}
    >
      <GifList term={results?.term} results={results?.items} />
    </List>
  );
}
