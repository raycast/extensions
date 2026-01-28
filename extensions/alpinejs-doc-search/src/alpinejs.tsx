import { ActionPanel, List, Action } from "@raycast/api";
import { useMemo } from "react";
import algoliaSearch from "algoliasearch";
import _ from "lodash";
import { useCachedPromise, useCachedState } from "@raycast/utils";

const APPID = "SM9GAGAUKZ";
const APIKEY = "1fad8740c0cf75209d11ae25f1f6f55c";
const INDEX = "alpinejs";

type Hierarchy = {
  lvl0: string | null;
  lvl1: string | null;
  lvl2: string | null;
  lvl3: string | null;
  lvl4: string | null;
  lvl5: string | null;
  lvl6: string | null;
};
type Result = {
  url: string;
  anchor: string;
  body: string;
  objectID: string;
  hierarchy: Hierarchy;
  _highlightResult: {
    content:
      | {
          value: string;
          matchlevel: string;
          fullyHighlighted: boolean;
          matchedWords: string[];
        }
      | undefined;
    hierarchy: Hierarchy;
  };
};

export default function SearchDocumentation() {
  const algoliaClient = useMemo(() => {
    return algoliaSearch(APPID, APIKEY);
  }, [APPID, APIKEY]);

  const algoliaIndex = useMemo(() => {
    return algoliaClient.initIndex(INDEX);
  }, [algoliaClient, INDEX]);

  const [searchText, setSearchText] = useCachedState("search", "install");

  const { isLoading: isLoading, data: searchResults } = useCachedPromise(
    async (query: string) => {
      const res = await algoliaIndex.search<Result>(query, {
        hitsPerPage: 15,
      });
      return Object.entries(
        _.groupBy(
          res.hits.filter((hit) => hit.hierarchy.lvl2),
          "hierarchy.lvl1"
        )
      );
    },
    [searchText],
    {
      initialData: [],
      keepPreviousData: true,
      failureToastOptions: {
        title: "Error searching Alpine.js documentation",
      },
    }
  );

  return (
    <List
      throttle={true}
      isLoading={isLoading}
      searchBarPlaceholder="Search Alpine.js Documentation"
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {!isLoading && !searchResults.length ? (
        <List.EmptyView
          icon="empty-icon.png"
          title="Whoops! We did not find any matches for your search."
          description="Try searching 'x-show'"
        />
      ) : (
        searchResults.map(([hitType, hitTypeResults]) => (
          <List.Section title={hitType} key={hitType}>
            {hitTypeResults.map((hit) => (
              <List.Item
                id={hit.objectID}
                key={hit.objectID}
                icon="command-icon2.png"
                title={(
                  (hit.hierarchy.lvl2 != null ? hit.hierarchy.lvl2 : "") +
                  " " +
                  (hit.hierarchy.lvl3 != null ? hit.hierarchy.lvl3 : "") +
                  " " +
                  (hit.hierarchy.lvl4 != null ? hit.hierarchy.lvl4 : "") +
                  " " +
                  (hit.hierarchy.lvl5 != null ? hit.hierarchy.lvl5 : "") +
                  " " +
                  (hit.hierarchy.lvl6 != null ? hit.hierarchy.lvl6 : "")
                ).replace("&amp;", "&")}
                actions={
                  <ActionPanel title="Actions">
                    <Action.OpenInBrowser url={hit.url} />
                    <Action.CopyToClipboard content={hit.url} title="Copy URL" />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
