import React, { useState } from "react";
import { handleError } from "./helpers/general";
import { List } from "@raycast/api";
import { SiteListItem } from "./components/SiteListItem";
import { useCachedPromise } from "@raycast/utils";
import { getParked, getUniqueId } from "./helpers/sites";
import { Site } from "./types/entities";

export default function Command() {
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(false);

  const {
    data: sites,
    isLoading: isLoadingSites,
    error: getSitesError,
    mutate: mutateSites,
  } = useCachedPromise(() => getParked());

  if (getSitesError) {
    handleError({ error: getSitesError, title: "Unable to get sites" });
  }

  const filteredSites = React.useMemo(() => {
    return sites ?? [];
  }, [sites]);

  return (
    <List isLoading={isLoadingSites} searchBarPlaceholder="Search sites..." isShowingDetail={isShowingDetail}>
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
    </List>
  );
}
