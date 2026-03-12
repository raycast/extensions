import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { searchDocs, stripHtml, decodeHtmlEntities } from "./api";
import { WooDoc } from "./types";

export default function SearchDocs() {
  const [searchText, setSearchText] = useState("");

  const {
    data: results,
    isLoading,
    error,
  } = useCachedPromise(
    async (query: string) => {
      if (!query.trim()) return [];
      return searchDocs(query);
    },
    [searchText],
    {
      keepPreviousData: true,
    },
  );

  // Get category tag for display
  const getCategory = (doc: WooDoc): string => {
    if (doc.categories && doc.categories.length > 0) {
      return doc.categories[0];
    }
    return "Post";
  };

  // Get the URL for the doc
  const getUrl = (doc: WooDoc): string => {
    return doc.permalink || doc.url || "";
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search WooCommerce.com docs..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {error && (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Search Error"
          description={error instanceof Error ? error.message : "Search failed"}
        />
      )}

      {!error && searchText.trim() === "" && (
        <List.EmptyView
          icon={{ source: Icon.Book }}
          title="Search WooCommerce.com Documentation"
          description="Start typing to search docs, guides, and blog posts"
        />
      )}

      {!error &&
        searchText.trim() !== "" &&
        (!results || results.length === 0) &&
        !isLoading && (
          <List.EmptyView
            icon={{ source: Icon.XMarkCircle }}
            title="No Results"
            description={`No documentation found for "${searchText}"`}
          />
        )}

      {(results || []).map((doc) => {
        const url = getUrl(doc);
        const title = decodeHtmlEntities(doc.title);
        const body = doc.body ? stripHtml(doc.body).slice(0, 100) : "";

        return (
          <List.Item
            key={doc.objectID}
            icon={{ source: Icon.Document, tintColor: Color.Blue }}
            title={title}
            subtitle={body}
            accessories={[
              { tag: { value: getCategory(doc), color: Color.Purple } },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={url} title="Open in Browser" />
                <Action.CopyToClipboard
                  content={url}
                  title="Copy URL"
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  content={title}
                  title="Copy Title"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
