import { useEffect, useState } from "react";
import { site, getParked, pathExists, configPath, searchSites } from "./utils";
import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { Site } from "./components/Site";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [sites, setSites] = useState<site[]>();

  useEffect(() => {
    setIsLoading(true);

    getParked()
      .then((sites: site[]) => {
        setSites(sites);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });

    setIsLoading(false);
  }, []);

  const onSearchTextChange = async (query: string) => {
    searchSites(query)
      .then((sites: site[]) => {
        setSites(sites);
        setIsLoading(false);
      })
      .catch((error: Error) => {
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Something went wrong!", error.message);
      });
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search sites..."
      throttle={false}
      onSearchTextChange={onSearchTextChange}
    >
      {!pathExists(configPath) && (
        <List.EmptyView
          title="No Valet Config File Found"
          description={`Please make sure Valet is installed and configured.\n\nPress enter to open the documentation.`}
          icon="no-view.png"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Laravel Valet docs"
                url="https://laravel.com/docs/master/valet#installation"
              />
            </ActionPanel>
          }
        />
      )}
      {pathExists(configPath) && (sites ?? []).length === 0 && (
        <List.EmptyView title="No Sites Found" icon="no-view.png" description="Try searching for something else" />
      )}
      {(sites ?? []).map((site: site) => (
        <Site site={site} key={site.name} />
      ))}
    </List>
  );
}
