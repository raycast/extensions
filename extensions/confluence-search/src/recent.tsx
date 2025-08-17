import "cross-fetch/polyfill";

import { List, showToast, Toast } from "@raycast/api";
import { useContext } from "react";
import { GET_CONFLUENCE_SEARCH_WITH_EXPAND } from "./api/graphql";
import { useQuery } from "@apollo/client";
import { buildAuthenticatedCommand } from "./util/AuthenticatedCommandContainer";
import { SiteContext } from "./util/SiteContext";
import { Site } from "./api/site";
import { mapToSearchResult, SearchResult, SEARCH_EXPAND, sortByLastViewed } from "./api/confluence";
import { SearchActions, SearchListItem } from "./SearchResults";

const RECENTS_COUNT = 50;
export default buildAuthenticatedCommand({ Command });

function Command() {
  const site = useContext(SiteContext);
  const { recentItems } = useRecentsQuery(site);

  return (
    <List isLoading={!recentItems}>
      <List.Section title="Recently Viewed" subtitle={recentItems?.length + ""}>
        {recentItems?.map((recentItem) => (
          <SearchListItem
            key={recentItem.id}
            searchResult={recentItem}
            actions={<SearchActions searchResult={recentItem} />}
          />
        ))}
      </List.Section>
    </List>
  );
}

function useRecentsQuery(site: Site) {
  const { loading, error, data } = useQuery(GET_CONFLUENCE_SEARCH_WITH_EXPAND, {
    variables: {
      cloudId: site.id,
      cql: `id in recentlyViewedContent(${RECENTS_COUNT})`,
      expand: SEARCH_EXPAND,
      limit: RECENTS_COUNT,
    },
    fetchPolicy: "cache-and-network",
  });

  // TODO: Improve error handling experience
  if (error) {
    console.error("recents error", error);
    showToast({ style: Toast.Style.Failure, title: "Could not retrieve recent", message: String(error) });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: SearchResult[] = data?.search?.results.map((item: any) => mapToSearchResult(item, data.search._links));
  const sortedItems = items && sortByLastViewed(items);

  return {
    loading,
    recentItems: sortedItems,
  };
}
