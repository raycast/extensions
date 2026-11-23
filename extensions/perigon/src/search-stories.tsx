import { ActionPanel, Action, Icon, Keyboard, List } from "@raycast/api";
import { usePromise, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { faviconMarkdown, FAVICON_STACK_LIMIT, loadFaviconStack, type FaviconImage } from "./lib/favicon";
import { PerigonApiError, searchStories } from "./lib/perigon-api";
import { perigonOAuth } from "./lib/perigon-oauth";
import type { PerigonStory } from "./lib/types";

function SearchStories() {
  const [searchText, setSearchText] = useState("");
  const queryReady = searchText.trim().length > 0;

  const { data, isLoading, error, revalidate } = usePromise(
    async (query: string, ready: boolean) => {
      if (!ready) {
        return [] as PerigonStory[];
      }
      return searchStories(query.trim());
    },
    [searchText, queryReady],
    {
      failureToastOptions: {
        title: "Could not search stories",
      },
    },
  );

  const stories = data ?? [];
  const clustersForbidden = error instanceof PerigonApiError && error.status === 403;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Perigon news stories…"
      throttle
      isShowingDetail={stories.length > 0}
      filtering={false}
    >
      {!queryReady ? (
        <List.EmptyView title="Search stories" description="Enter a topic or headline to find clustered stories." />
      ) : clustersForbidden ? (
        <List.EmptyView
          title="Clusters access required"
          description="Your Perigon organization needs the story clusters scope to use this command. Use Search News or Perigon AI for article-level results."
        />
      ) : error ? (
        <List.EmptyView
          title="Search failed"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => void revalidate()} />
            </ActionPanel>
          }
        />
      ) : !isLoading && stories.length === 0 ? (
        <List.EmptyView title="No stories" description="No stories matched your query." />
      ) : (
        stories.map((story) => <StoryListItem key={story.id} story={story} />)
      )}
    </List>
  );
}

function StoryListItem({ story }: { story: PerigonStory }) {
  const articleLabel = story.totalCount === 1 ? "1 article" : `${story.totalCount} articles`;
  const sourceKey = story.uniqueSources.slice(0, FAVICON_STACK_LIMIT).join("\n");
  const { data: sources } = usePromise(
    async (key: string) => {
      const domains = key.length > 0 ? key.split("\n") : [];
      return loadFaviconStack(domains);
    },
    [sourceKey],
  );

  return (
    <List.Item
      title={story.name}
      accessories={[{ text: articleLabel }]}
      detail={<List.Item.Detail markdown={buildStoryMarkdown(story, sources)} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Story on Perigon" url={perigonStoryUrl(story.id)} />
          <Action.CopyToClipboard
            title="Copy Summary"
            content={story.summary || story.shortSummary || story.name}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard title="Copy Story ID" content={story.id} />
        </ActionPanel>
      }
    />
  );
}

function perigonStoryUrl(storyId: string): string {
  return `https://perigon.io/discover/stories/${encodeURIComponent(storyId)}`;
}

function publisherStackLabel(story: PerigonStory): string {
  const publisherCount = story.uniqueSourcesCount || story.uniqueSources.length;
  const hidden = story.uniqueSources.length - FAVICON_STACK_LIMIT;
  if (hidden > 0) {
    return `+${hidden} more`;
  }
  return publisherCount === 1 ? "1 publisher" : `${publisherCount} publishers`;
}

function buildStoryMarkdown(story: PerigonStory, sources: FaviconImage | undefined): string {
  const lines: string[] = [`# ${story.name}`, ""];
  if (story.summary) {
    lines.push(story.summary, "");
  } else if (story.shortSummary) {
    lines.push(story.shortSummary, "");
  }
  if (sources) {
    const label = publisherStackLabel(story);
    lines.push(`${faviconMarkdown(sources, "Publishers", "absmiddle")} ${label}`, "");
  }
  const publisherCount = story.uniqueSourcesCount || story.uniqueSources.length;
  const meta = [`**Articles:** ${story.totalCount}`];
  if (!sources) {
    meta.push(`**Publishers:** ${publisherCount}`);
  }
  if (story.updatedAt) {
    meta.push(`**Updated:** ${formatDate(story.updatedAt)}`);
  }
  lines.push(meta.join("  \n"));
  return lines.join("\n");
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export default withAccessToken(perigonOAuth)(SearchStories);
