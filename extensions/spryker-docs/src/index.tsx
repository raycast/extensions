import { useMemo, useState } from "react";
import { ActionPanel, List, showToast, Action, Toast } from "@raycast/api";
import algoliasearch from "algoliasearch";
import striptags from "striptags";
import { ENV } from "./env";
import { Hit, Query, ResultItem } from "./types/algolia";
import currentDocs from "./documentation/default.json";

const ICON = {
  source: {
    light: "spryker.png",
    dark: "spryker@dark.png",
  },
};
type DocLink = {
  url: string;
  title: string;
};

export default function main() {
  const env = ENV;
  const { ALGOLIA_INDICES, ALGOLIA_APP_ID, ALGOLIA_API_KEY, SPRYKER_DOCS_URL } = env;
  const [searchResults, setSearchResults] = useState<any[] | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const algolia = useMemo(() => {
    return algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
  }, []);

  const getTitle = (hit: Hit): string => {
    return striptags(hit?.title || "");
  };

  const getSubTitle = (hit: Hit): string => {
    return striptags(hit?.content || "");
  };

  const getUrl = (url: string): string => {
    return SPRYKER_DOCS_URL + url;
  };

  const search = async (query = "") => {
    if (query === "") {
      return;
    }

    const queryByIndices: Query = ALGOLIA_INDICES.map((index) => ({
      indexName: index.key,
      query: query,
      params: {
        hitsPerPage: 5,
        distinct: true,
      },
    }));

    setIsLoading(true);
    return algolia
      .multipleQueries(queryByIndices)
      .then((res) => {
        setIsLoading(false);

        return res.results;
      })
      .catch(({ message }) => {
        setIsLoading(false);
        showToast({
          style: Toast.Style.Failure,
          title: "Error searching Spryker <Doc></Doc>umentation",
          message: message,
        });

        return [];
      });
  };

  return (
    <List
      throttle={true}
      isLoading={isLoading}
      onSearchTextChange={async (query) => setSearchResults(await search(query))}
    >
      {searchResults
        ? searchResults.map((item: ResultItem) => (
            <List.Section title={ALGOLIA_INDICES.find((index) => index.key == item.index)?.name}>
              {item.hits.map((hit: Hit) => (
                <List.Item
                  key={hit.objectID}
                  title={getTitle(hit)}
                  subtitle={getSubTitle(hit)}
                  icon={ICON}
                  actions={
                    <ActionPanel title={hit.url}>
                      <Action.OpenInBrowser url={getUrl(hit.url)} title="Open in Browser" />
                      <Action.CopyToClipboard content={getUrl(hit.url)} title="Copy URL" />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ))
        : Object.entries(currentDocs).map(([section, items]: Array<any>) => (
            <List.Section title={section} key={section}>
              {items.map((item: DocLink) => {
                return (
                  <List.Item
                    key={item.url}
                    title={item.title}
                    icon={ICON}
                    actions={
                      <ActionPanel title={item.url}>
                        <Action.OpenInBrowser url={getUrl(item.url)} title="Open in Browser" />
                        <Action.CopyToClipboard content={getUrl(item.url)} title="Copy URL" />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          ))}
    </List>
  );
}
