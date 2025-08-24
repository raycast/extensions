import { Action, ActionPanel, List, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { SearchResults } from "./lib";
import _ from "lodash";
import algoliaSearch from "algoliasearch";

const APPID = "LAX13WQLUB";
const APIKEY = "2c93ff220c2007473bcf88e4e730199e";
const INDEX = "lucid-adonisjs";

export default function SearchDocumentation() {
  const algoliaClient = useMemo(() => {
    return algoliaSearch(APPID, APIKEY);
  }, [APPID, APIKEY]);

  const algoliaIndex = useMemo(() => {
    return algoliaClient.initIndex(INDEX);
  }, [algoliaClient, INDEX]);

  const [searchResults, setSearchResults] = useState<SearchResults | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const search = async (query = "api"): Promise<SearchResults> => {
    setIsLoading(true);
    !query && (query = "api");

    return await algoliaIndex
      .search(query, {
        hitsPerPage: 15,
      })
      .then((res) => {
        return Object.entries(_.groupBy(res.hits, "hierarchy.lvl1")) as SearchResults;
      })
      .catch((err) => {
        showToast(Toast.Style.Failure, "Error searching AdonisJS documentation", err.message);
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
      searchBarPlaceholder={"Search AdonisJS Documentation"}
      onSearchTextChange={async (query) => {
        setSearchResults(await search(query));
        setIsLoading(false);
      }}
    >
      {searchResults?.map(([hitType, hitTypeResults]) => (
        <List.Section title={hitType} key={hitType}>
          {hitTypeResults
            ?.filter((hit) => hit.hierarchy?.lvl2 != null)
            .map(
              (hit) =>
                hit && (
                  <List.Item
                    id={hit.objectID}
                    key={hit.objectID}
                    icon="lucid-logo.png"
                    title={(
                      (hit.hierarchy?.lvl2 != null ? hit.hierarchy.lvl2 : "") +
                      " " +
                      (hit.hierarchy?.lvl3 != null ? hit.hierarchy.lvl3 : "") +
                      " " +
                      (hit.hierarchy?.lvl4 != null ? hit.hierarchy.lvl4 : "") +
                      " " +
                      (hit.hierarchy?.lvl5 != null ? hit.hierarchy.lvl5 : "") +
                      " " +
                      (hit.hierarchy?.lvl6 != null ? hit.hierarchy.lvl6 : "")
                    ).replace("&amp;", "&")}
                    actions={
                      <ActionPanel title="Actions">
                        <Action.OpenInBrowser url={hit.url} />
                        <Action.CopyToClipboard content={hit.url} title="Copy URL" />
                      </ActionPanel>
                    }
                  />
                ),
            )}
        </List.Section>
      ))}
      <List.EmptyView icon="lucid-logo-128.png" title="Whoops! We did not find any matches." />
    </List>
  );
}
