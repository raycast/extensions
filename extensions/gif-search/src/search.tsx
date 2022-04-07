import { useEffect } from "react";
import { List, showToast, Toast } from "@raycast/api";

import { ServiceName, getShowPreview } from "./preferences";
import useSearchAPI from "./hooks/useSearchAPI";
import { GifList } from "./components/GifList";

import "./fetch-polyfill";

export default function Command() {
  const showPreview = getShowPreview();

  const [results, isLoading, setSearchService, setSearchTerm, searchTerm] = useSearchAPI({});
  const onServiceChange = (service: string) => {
    setSearchService(service as ServiceName);
    setSearchTerm(searchTerm);
  };

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
      searchBarAccessory={
        <List.Dropdown tooltip="" storeValue={true} onChange={onServiceChange}>
          <List.Dropdown.Item title="Giphy" value="giphy" />
          <List.Dropdown.Item title="Tenor" value="tenor" />
          <List.Dropdown.Item title="Finer Gifs Club" value="finergifs" />
        </List.Dropdown>
      }
      enableFiltering={false}
      isLoading={isLoading}
      throttle={true}
      searchBarPlaceholder="Search for gifs..."
      onSearchTextChange={setSearchTerm}
      isShowingDetail={showPreview && results?.items?.length != 0}
    >
      <GifList term={results?.term} results={results?.items} />
    </List>
  );
}
