import { List, Toast, showToast } from "@raycast/api";
import { WebflowProvider } from "./utils/context";
import { useEffect, useState } from "react";
import { getSites } from "./webflow/client";
import SiteListItem from "./components/SiteListItem";
import { Webflow } from "webflow-api";

function ShowSites() {
  const [searchText, setSearchText] = useState<string>();
  const [filteredSites, setFilteredSites] = useState<Webflow.Sites>();
  const [sites, setSites] = useState<Webflow.Sites>();
  const response = getSites();

  if (response.error) {
    showToast(Toast.Style.Failure, "Failed to load sites", response.error);
  }

  useEffect(() => {
    if (response.result) {
      setSites(response.result);
      setFilteredSites(response.result);
    }
  }, [response.result]);

  useEffect(() => {
    if (sites) {
      const filtered = sites?.sites?.filter((site) => {
        return site.displayName?.toLowerCase().includes(searchText?.toLowerCase() ?? "");
      });
      setFilteredSites({ sites: filtered });
    }
  }, [searchText]);

  return (
    <List
      searchBarPlaceholder="Search sites..."
      onSearchTextChange={setSearchText}
      isLoading={response.isLoading}
      throttle
    >
      {filteredSites?.sites?.map((site) => <SiteListItem key={site.id} site={site} />)}
    </List>
  );
}

export default () => (
  <WebflowProvider>
    <ShowSites />
  </WebflowProvider>
);
