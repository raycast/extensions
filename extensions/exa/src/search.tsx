import { Action, ActionPanel, List, showToast, Toast, Icon, Detail } from "@raycast/api";
import { useState } from "react";
import exa from "./exa";
import { usePromise } from "@raycast/utils";
import FindSimilar from "./find-similar";

export default function Search() {
  const [query, setQuery] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const { isLoading, data } = usePromise(
    async (q: string) => {
      if (!q) return [];
      const result = await exa.search(q, {
        numResults: 20,
        useAutoprompt: true,
      });
      return result.results;
    },
    [query],
    {
      onError: (error) => {
        showToast({ style: Toast.Style.Failure, title: "Search failed", message: error.message });
      },
    },
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Exa..."
      throttle
      isShowingDetail={isShowingDetail}
    >
      {data?.map((result) => (
        <List.Item
          key={result.id}
          title={result.title || result.url}
          subtitle={!isShowingDetail ? result.url : undefined}
          icon={Icon.Globe}
          accessories={
            !isShowingDetail
              ? [{ text: result.publishedDate ? new Date(result.publishedDate).toLocaleDateString() : "" }]
              : []
          }
          detail={
            <List.Item.Detail
              markdown={`# ${result.title}\n\n${result.url}\n\n${
                result.publishedDate ? `*Published: ${new Date(result.publishedDate).toLocaleDateString()}*\n\n` : ""
              }${result.text || "No preview available."}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Domain" text={new URL(result.url).hostname} />
                  <List.Item.Detail.Metadata.Label
                    title="Published"
                    text={result.publishedDate ? new Date(result.publishedDate).toLocaleDateString() : "-"}
                  />
                  <List.Item.Detail.Metadata.Label title="Score" text={result.score?.toFixed(2) || "-"} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Toggle Preview"
                icon={Icon.Sidebar}
                onAction={() => setIsShowingDetail(!isShowingDetail)}
              />
              <Action.OpenInBrowser url={result.url} />
              <Action.CopyToClipboard title="Copy URL" content={result.url} />
              <Action.Push
                title="View Content"
                icon={Icon.Text}
                target={<ContentView url={result.url} title={result.title || "Content"} />}
              />
              <ActionPanel.Section title="Find Similar">
                <Action.Push
                  title="Find Similar"
                  icon={Icon.MagnifyingGlass}
                  target={<FindSimilar url={result.url} />}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ContentView({ url, title }: { url: string; title: string }) {
  const { isLoading, data, error } = usePromise(
    async (u: string) => {
      const result = await exa.getContents([u], { text: true });
      return result.results[0];
    },
    [url],
  );

  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Failed to fetch content", message: error.message });
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        isLoading
          ? "Loading content..."
          : `# ${data?.title || title}\n\n${data?.url}\n\n${data?.text || "No content available."}`
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} />
          <Action.CopyToClipboard title="Copy Content" content={data?.text || ""} />
          <Action.CreateSnippet
            title="Save as Snippet"
            snippet={{ name: data?.title || "Exa Content", text: data?.text || "" }}
          />
        </ActionPanel>
      }
    />
  );
}
