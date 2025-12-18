import { Action, ActionPanel, List, showToast, Toast, Icon } from "@raycast/api";
import { useState } from "react";
import exa from "./exa";
import { usePromise } from "@raycast/utils";

export default function FindSimilar({ url }: { url?: string }) {
  const [queryUrl, setQueryUrl] = useState(url || "");
  const [excludeSource, setExcludeSource] = useState(true);

  const { isLoading, data } = usePromise(
    async (u: string, exclude: boolean) => {
      if (!u) return [];
      const result = await exa.findSimilar(u, {
        numResults: 20,
        excludeSourceDomain: exclude,
      });
      return result.results;
    },
    [queryUrl, excludeSource],
    {
      onError: (error) => {
        showToast({ style: Toast.Style.Failure, title: "Find Similar failed", message: error.message });
      },
    },
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQueryUrl}
      searchText={queryUrl}
      searchBarPlaceholder="Enter URL to find similar..."
      throttle
    >
      {data?.map((result) => (
        <List.Item
          key={result.id}
          title={result.title || result.url}
          subtitle={new URL(result.url).hostname}
          icon={result.favicon || Icon.Globe}
          accessories={[{ text: result.score ? `Score: ${result.score.toFixed(2)}` : "" }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={result.url} />
              <Action.CopyToClipboard title="Copy URL" content={result.url} />
              <Action
                title={excludeSource ? "Include Source Domain" : "Exclude Source Domain"}
                icon={excludeSource ? Icon.CheckCircle : Icon.Circle}
                onAction={() => setExcludeSource(!excludeSource)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
