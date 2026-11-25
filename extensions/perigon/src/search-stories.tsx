import { ActionPanel, Action, Keyboard, List } from "@raycast/api";
import { usePromise, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { LoadFailureEmptyView } from "./lib/load-failure-empty-view";
import { PerigonApiError, searchStories } from "./lib/perigon-api";
import { perigonOAuth } from "./lib/perigon-oauth";
import type { PerigonStory } from "./lib/types";

const PUBLISHER_LABEL_LIMIT = 8;

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

  const listProps = {
    isLoading,
    onSearchTextChange: setSearchText,
    searchBarPlaceholder: "Search Perigon news stories…",
    throttle: true as const,
    isShowingDetail: stories.length > 0,
    filtering: false as const,
  };

  if (queryReady && clustersForbidden) {
    return (
      <List {...listProps}>
        <LoadFailureEmptyView
          title="Clusters access required"
          description="Your Perigon organization needs the story clusters scope to use this command. Use Search News or Perigon AI for article-level results."
          revalidate={revalidate}
        />
      </List>
    );
  }

  if (queryReady && error) {
    return (
      <List {...listProps}>
        <LoadFailureEmptyView title="Search failed" description={error.message} revalidate={revalidate} />
      </List>
    );
  }

  return (
    <List {...listProps}>
      {!queryReady ? (
        <List.EmptyView title="Search stories" description="Enter a topic or headline to find clustered stories." />
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

  return (
    <List.Item
      title={story.name}
      accessories={[{ text: articleLabel }]}
      detail={<List.Item.Detail markdown={buildStoryMarkdown(story)} />}
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
  const hidden = story.uniqueSources.length - PUBLISHER_LABEL_LIMIT;
  if (hidden > 0) {
    return `+${hidden} more`;
  }
  return publisherCount === 1 ? "1 publisher" : `${publisherCount} publishers`;
}

function buildStoryMarkdown(story: PerigonStory): string {
  const lines: string[] = [`# ${story.name}`, ""];
  if (story.summary) {
    lines.push(story.summary, "");
  } else if (story.shortSummary) {
    lines.push(story.shortSummary, "");
  }
  const publisherCount = story.uniqueSourcesCount || story.uniqueSources.length;
  if (publisherCount > 0) {
    lines.push(`**Publishers:** ${publisherStackLabel(story)}`, "");
  }
  const meta = [`**Articles:** ${story.totalCount}`];
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
