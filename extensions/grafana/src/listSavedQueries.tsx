import { Action, ActionPanel, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { preferences } from "./helpers/preferences";
import { useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";
import { QueryCacheEntry } from "./createSavedQuery";
import { createExploreLink } from "./helpers/helpers";
import { useFrecencySorting } from "@raycast/utils";

export type QueryCacheEntryWithID = QueryCacheEntry & {
  id: string;
};

async function getQueries() {
  const values = await LocalStorage.allItems();
  return Object.entries(values).map((query) => ({ key: query[0], value: query[1] }));
}

export default function Command() {
  const [queries, setQueries] = useState<QueryCacheEntryWithID[]>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    async function fetchCache() {
      try {
        const items = await getQueries();
        const queries = items
          .filter((item) => item.key.startsWith("query::"))
          .map((item) => {
            return {
              ...(JSON.parse(item.value) as QueryCacheEntry),
              id: item.key,
            };
          });

        queries.map((item) => {
          console.log(createSearchableKeywordsFromString(item.query));
        });

        setQueries(queries);
      } catch (error) {
        console.error(error);
        setError(error instanceof Error ? error : new Error("Something went wrong"));
      }
    }

    fetchCache();
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  /**
   * Function to create an array of searchable keywords from a string
   * Useful to convert a PromQL or LogQl query into an array of keywords
   * searchable by Raycast
   */
  const createSearchableKeywordsFromString = (string: string) =>
    string
      .split(/[(){},= ]/g)
      .filter((item) => item !== "")
      .map((word) => word.replace(/"/g, ""));

  const handleDelete = async (query: QueryCacheEntryWithID) => {
    const updatedItems = queries!.filter((item) => item.id !== query.id);
    setQueries(updatedItems);
    await LocalStorage.removeItem(query.id);
    showToast(Toast.Style.Success, "Query deleted");
  };

  const { data: sortedQueries, visitItem } = useFrecencySorting(queries);

  return (
    <List>
      {sortedQueries.map((query) => (
        <List.Item
          key={query.query + query.datasource.uid}
          title={query.name && query.name !== "" ? query.name : query.query}
          subtitle={query.name && query.name !== "" ? query.query : ""}
          icon={`${preferences.rootApiUrl}/${query.datasource.typeLogoUrl}`}
          keywords={createSearchableKeywordsFromString(query.query)}
          accessories={[
            {
              tag: {
                value: query.datasource.name,
              },
              icon: `${preferences.rootApiUrl}/${query.datasource.typeLogoUrl}`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Query in Explore"
                url={createExploreLink(query.datasource.uid, query.query)}
                onOpen={() => visitItem(query)}
              />
              <Action.CopyToClipboard title="Copy Query to Clipboard" content={query.query} />
              <Action
                title="Delete"
                icon={{ source: Icon.Trash }}
                shortcut={Keyboard.Shortcut.Common.Remove}
                style={Action.Style.Destructive}
                onAction={async () => {
                  handleDelete(query);
                }}
              />
            </ActionPanel>
          }
        ></List.Item>
      ))}
    </List>
  );
}
