import { ActionPanel, List, Action, showToast, Toast, Detail, Icon, Color } from "@raycast/api";
import { useState } from "react";
import { useRetoolDocSearch } from "./utils";

const BASE_URL = "https://docs.retool.com/";
const ICON = "icon@dark.png";

export default function Command() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { isLoading, searchResults, error } = useRetoolDocSearch(searchQuery);

  if (error) {
    showToast(Toast.Style.Failure, "Algolia Error", error);
  }

  return (
    <List
      searchBarPlaceholder="Search Retool Documentation"
      throttle={true}
      isLoading={isLoading}
      onSearchTextChange={async (query) => setSearchQuery(query)}
    >
      {searchResults?.map((result) => (
        <List.Item
          key={result.objectID}
          title={result.title}
          icon={ICON}
          subtitle={
            // remove all html tags from the description
            result._snippetResult?.excerpt?.value?.replace(/<[^>]*>/g, "") || result?.title
          }
          actions={
            <ActionPanel title={`${result.title} - ${result.subdomain}`}>
              <Action.OpenInBrowser
                url={result.link_url || `${BASE_URL}${result.internalLink}`}
                title="Open in Browser"
              />
              <Action.CopyToClipboard
                content={result.link_url || `${BASE_URL}${result.internalLink}`}
                title="Copy URL"
              />
              <Action.Push
                title="Show Details"
                icon={{
                  source: Icon.Window,
                  tintColor: Color.Orange,
                }}
                target={
                  <Detail
                    navigationTitle={`Retool - ${result.title}`}
                    actions={
                      <ActionPanel>
                        <Action.OpenInBrowser
                          url={result.link_url || `${BASE_URL}${result.internalLink}`}
                          title="Open in Browser"
                        />
                        <Action.CopyToClipboard
                          content={result.link_url || `${BASE_URL}${result.internalLink}`}
                          title="Copy URL"
                        />
                      </ActionPanel>
                    }
                    markdown={`# ${result._highlightResult.title.value.replace(
                      /<[^>]*>/g,
                      ""
                    )} \n ${result._highlightResult.body.value.replace(/<[^>]*>/g, "")}`}
                  />
                }
                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
