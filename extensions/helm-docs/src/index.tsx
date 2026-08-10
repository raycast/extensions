import { useMemo, useState } from "react";
import { ActionPanel, getPreferenceValues, List, showToast, Action, Toast } from "@raycast/api";
import algoliasearch from "algoliasearch/lite";
import striptags from "striptags";
import { ENV } from "./env";
import { Hit, KeyValueHierarchy } from "./types/algolia";

const ICON = {
  source: {
    light: "helm.png",
    dark: "helm@dark.png",
  },
};

type DocLink = {
  url: string;
  title: string;
};

const Versions: { [key: string]: { [key: string]: DocLink[] } } = {
  "v3.8.0": require("./documentation/v3.8.0.json"),
  "v2.16.7": require("./documentation/v2.16.7.json"),
  "v2.14.0": require("./documentation/v2.14.0.json"),
};

export default function main() {
  const preferences = getPreferenceValues();
  const currentDocs = Versions[preferences.version];
  const env = ENV[preferences.version];

  const algolia = useMemo(() => {
    const { ALGOLIA_APP_ID, ALGOLIA_API_KEY, ALGOLIA_INDEX } = env;

    return algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY).initIndex(ALGOLIA_INDEX);
  }, [env, ENV]);

  const [searchResults, setSearchResults] = useState<any[] | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const hierarchyToArray = (hierarchy: KeyValueHierarchy) => {
    return Object.values(hierarchy).filter((hierarchyEntry: string | unknown) => hierarchyEntry);
  };

  const getTitle = (hit: Hit): string => {
    return hierarchyToArray(hit.hierarchy).pop() || "";
  };

  const getSubTitle = (hit: Hit): string => {
    const highlightResult = striptags(hit._highlightResult?.content?.value || "");
    if (highlightResult) {
      return highlightResult;
    }

    const hierarchy = hierarchyToArray(hit.hierarchy) || [];
    hierarchy.pop();
    return hierarchy.join(" > ");
  };

  const search = async (query = "") => {
    if (query === "") {
      return;
    }

    setIsLoading(true);

    return algolia
      .search(query)
      .then((res) => {
        setIsLoading(false);

        return res.hits;
      })
      .catch(({ message }) => {
        setIsLoading(false);
        showToast({
          style: Toast.Style.Failure,
          title: "Error searching Helm Documentation",
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
        ? searchResults.map((hit: Hit) => (
            <List.Item
              key={hit.objectID}
              title={getTitle(hit)}
              subtitle={getSubTitle(hit)}
              icon={ICON}
              actions={
                <ActionPanel title={hit.url}>
                  <Action.OpenInBrowser url={hit.url} title="Open in Browser" />
                  <Action.CopyToClipboard content={hit.url} title="Copy URL" />
                </ActionPanel>
              }
            />
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
                        <Action.OpenInBrowser url={item.url} title="Open in Browser" />
                        <Action.CopyToClipboard content={item.url} title="Copy URL" />
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
