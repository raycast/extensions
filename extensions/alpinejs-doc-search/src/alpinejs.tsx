import { ActionPanel, List, showToast, Action, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import algoliaSearch from "algoliasearch";
import _ from "lodash";

const APPID = "SM9GAGAUKZ";
const APIKEY = "1fad8740c0cf75209d11ae25f1f6f55c";
const INDEX = "alpinejs";

type result = {
  url: string;
  anchor: string;
  body: string;
  objectID: string;
  hierarchy: {
    [key: string]: string;
  };
  _highlightResult: {
    content:
      | {
          value: string;
          matchlevel: string;
          fullyHighlighted: boolean;
          matchedWords: string[];
        }
      | undefined;
    hierarchy: {
      [key: string]: {
        value: string;
        matchLevel: string;
        matchedWords: string[];
      };
    };
  };
};

export default function SearchDocumentation() {
  const algoliaClient = useMemo(() => {
    return algoliaSearch(APPID, APIKEY);
  }, [APPID, APIKEY]);

  const algoliaIndex = useMemo(() => {
    return algoliaClient.initIndex(INDEX);
  }, [algoliaClient, INDEX]);

  const [searchResults, setSearchResults] = useState<any[] | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const search = async (query = "install") => {
    setIsLoading(true);

    return await algoliaIndex
      .search(query, {
        hitsPerPage: 15,
      })
      .then((res) => {
        return Object.entries(_.groupBy(res.hits, "hierarchy.lvl1")) || [];
      })
      .catch((err) => {
        showToast(Toast.Style.Failure, "Error searching alpinejs docs", err.message);
        return [];
      });
  };

  useEffect(() => {
    (async () => {
      setSearchResults(await search());
      setIsLoading(false);
    })();
  }, []);

  return (
    <List
      throttle={true}
      isLoading={isLoading}
      searchBarPlaceholder={"Search Alpine.js Documentation"}
      onSearchTextChange={async (query) => {
        setSearchResults(await search(query));
        setIsLoading(false);
      }}
    >
      {searchResults?.map(([hitType, hitTypeResults]) => (
        <List.Section title={hitType} key={hitType}>
          {hitTypeResults
            ?.filter((hit: { hierarchy: { lvl2: null } }) => hit.hierarchy.lvl2 != null)
            .map((hit: result) => (
              <List.Item
                id={hit.objectID}
                key={hit.objectID}
                icon="command-icon2.png"
                title={
                  (hit.hierarchy.lvl2 != null ? hit.hierarchy.lvl2 : "") +
                  " " +
                  (hit.hierarchy.lvl3 != null ? hit.hierarchy.lvl3 : "")
                }
                actions={
                  <ActionPanel title={hit.url}>
                    <Action.OpenInBrowser url={hit.url} />
                    <Action.CopyToClipboard content={hit.url} title="Copy URL" />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
      <List.EmptyView icon="empty-icon.png" title="Whoops! We did not find any matches for your search." />
    </List>
  );
}
