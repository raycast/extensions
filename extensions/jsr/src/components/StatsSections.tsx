import type { Dispatch, ReactNode, SetStateAction } from "react";

import { List } from "@raycast/api";

import type { StatsData } from "@/types";

import { packageToSearchResultDocument } from "@/lib/convert";

import ListItem from "@/components/ListItem";

type StatsSectionsProps = {
  statsData?: StatsData;
  enabled: boolean;
  setIsShowingDetails: Dispatch<SetStateAction<boolean>>;
  isShowingDetails: boolean;
  extraActions: ReactNode;
  searchQueryURL?: string;
};

const StatsSections = ({
  statsData,
  enabled,
  setIsShowingDetails,
  isShowingDetails,
  extraActions,
  searchQueryURL,
}: StatsSectionsProps) => {
  if (!statsData || !enabled) {
    return null;
  }
  return (
    <>
      <List.Section title="Featured">
        {statsData.featured.map((result) => (
          <ListItem
            searchQueryURL={searchQueryURL}
            key={`featured/${result.scope}/${result.name}`}
            item={packageToSearchResultDocument(result)}
            toggleDetails={() => {
              setIsShowingDetails((state) => !state);
            }}
            isShowingDetails={isShowingDetails}
            extraActions={extraActions}
          />
        ))}
      </List.Section>
      <List.Section title="Newest">
        {statsData.newest.map((result) => (
          <ListItem
            searchQueryURL={searchQueryURL}
            key={`newest/${result.scope}/${result.name}`}
            item={packageToSearchResultDocument(result)}
            toggleDetails={() => {
              setIsShowingDetails((state) => !state);
            }}
            isShowingDetails={isShowingDetails}
            extraActions={extraActions}
          />
        ))}
      </List.Section>
    </>
  );
};

export default StatsSections;
