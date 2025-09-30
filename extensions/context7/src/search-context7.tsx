import { ActionPanel, Action, List, getPreferenceValues, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState } from "react";
import { useFetch } from "@raycast/utils";

interface Preferences {
  apiKey: string;
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  branch: string;
  lastUpdateDate: string;
  state: string;
  totalTokens: number;
  totalSnippets: number;
  totalPages: number;
  stars: number;
  trustScore: number;
  versions: string[];
}

interface Context7Response {
  results: SearchResult[];
  metadata: {
    authentication: string;
  };
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const preferences = getPreferenceValues<Preferences>();

  const { isLoading, data } = useFetch<Context7Response>(
    `https://context7.com/api/v1/search?query=${encodeURIComponent(searchText)}`,
    {
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
      },
      execute: searchText.length > 0,
      keepPreviousData: true,
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: error.message,
        });
      },
    },
  );

  const results = data?.results || [];

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Context7 documentation..."
      throttle
      isShowingDetail={results.length > 0}
    >
      {searchText === "" && results.length === 0 ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Type to search Context7 documentation" />
      ) : (
        results.map((result: SearchResult) => {
          const lastUpdateDate = new Date(result.lastUpdateDate);
          const now = new Date();
          const diffMs = now.getTime() - lastUpdateDate.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          let timeAgo: string;
          if (diffDays === 0) {
            timeAgo = "Today";
          } else if (diffDays === 1) {
            timeAgo = "Yesterday";
          } else if (diffDays < 7) {
            timeAgo = `${diffDays} days ago`;
          } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            timeAgo = weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
          } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            timeAgo = months === 1 ? "1 month ago" : `${months} months ago`;
          } else {
            const years = Math.floor(diffDays / 365);
            timeAgo = years === 1 ? "1 year ago" : `${years} years ago`;
          }

          return (
            <List.Item
              key={result.id}
              title={result.title}
              subtitle={timeAgo}
              detail={
                <List.Item.Detail
                  markdown={`### ${result.title}\n\n${result.description}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Library ID" text={result.id} icon={Icon.Link} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Stars"
                        text={result.stars >= 0 ? result.stars.toLocaleString() : "N/A"}
                        icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Trust Score"
                        text={result.trustScore >= 0 ? result.trustScore.toFixed(1) : "N/A"}
                        icon={{ source: Icon.LevelMeter, tintColor: Color.Blue }}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Total Snippets"
                        text={result.totalSnippets.toLocaleString()}
                        icon={Icon.CodeBlock}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Total Pages"
                        text={result.totalPages.toLocaleString()}
                        icon={Icon.Document}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Total Tokens"
                        text={result.totalTokens.toLocaleString()}
                        icon={Icon.Layers}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Branch" text={result.branch} icon={Icon.Leaf} />
                      <List.Item.Detail.Metadata.Label title="State" text={result.state} icon={Icon.CheckCircle} />
                      <List.Item.Detail.Metadata.Label
                        title="Last Updated"
                        text={`${timeAgo} (${lastUpdateDate.toLocaleDateString()})`}
                        icon={Icon.Calendar}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`https://context7.com${result.id}`} />
                  <Action.CopyToClipboard
                    title="Copy Library ID"
                    content={result.id}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
