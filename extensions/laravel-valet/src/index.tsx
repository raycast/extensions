import { useState, useMemo } from "react";
import { handleError, isRunning } from "./helpers/general";
import { List } from "@raycast/api";
import { SiteListItem } from "./components/SiteListItem";
import { useCachedPromise } from "@raycast/utils";
import { getParked, getUniqueId } from "./helpers/sites";
import { Site } from "./types/entities";
import { start } from "./helpers/commands";
import { ValetListItems } from "./components/ValetListItems";

export default function Command() {
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(false);
  const [showValetCommands, setShowValetCommands] = useState<boolean>(true);

  const {
    data: sites,
    isLoading: isLoadingSites,
    error: getSitesError,
    mutate: mutateSites,
  } = useCachedPromise(() => getParked());

  const filteredSites = useMemo(() => {
    return sites ?? [];
  }, [sites]);

  if (!isRunning()) {
    handleError({
      error: getSitesError,
      title: "Valet is not running",
      primaryAction: {
        title: "Start Valet",
        shortcut: { modifiers: ["cmd", "shift"], key: "r" },
        onAction: () => start(),
      },
    });
  }

  if (getSitesError) {
    handleError({ error: getSitesError, title: "Unable to get sites" });
  }

  return (
    <List
      isLoading={isLoadingSites}
      searchBarPlaceholder="Search sites..."
      isShowingDetail={isShowingDetail}
      filtering={true}
      onSearchTextChange={
        // If there is search dont show the valet commands
        (searchText) => setShowValetCommands(searchText.length === 0)
      }
    >
      {showValetCommands && (
        <List.Section title="Commands">
          <ValetListItems />
        </List.Section>
      )}
      <List.Section title="Sites">
        {filteredSites.map((site: Site) => {
          return (
            <SiteListItem
              key={getUniqueId(site)}
              site={site}
              mutateSites={mutateSites}
              isShowingDetail={isShowingDetail}
              setIsShowingDetail={setIsShowingDetail}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
