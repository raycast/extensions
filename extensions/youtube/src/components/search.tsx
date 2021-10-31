import { youtube_v3 } from "@googleapis/youtube";
import { ActionPanel, Detail, List, OpenInBrowserAction, PushAction, showToast, ToastStyle } from "@raycast/api";
import { GaxiosResponse } from "googleapis-common";
import { useState } from "react";
import { getErrorMessage } from "../lib/utils";
import { SearchType, useRefresher, youtubeClient } from "../lib/youtubeapi";

export function OpenVideoInBrowser(props: { videoId: string | null | undefined }): JSX.Element | null {
  const videoId = props.videoId;
  if (videoId) {
    return <OpenInBrowserAction title="Open Video in Browser" url={`https://youtube.com/watch?v=${videoId}`} />;
  }
  return null;
}

export function OpenChannelInBrowser(props: {
  snippet: youtube_v3.Schema$SearchResultSnippet | undefined;
}): JSX.Element | null {
  const channelId = props.snippet?.channelId;
  if (channelId) {
    return <OpenInBrowserAction title="Open Channel in Browser" url={`https://youtube.com/channel/${channelId}`} />;
  }
  return null;
}

export function SnippetSearchListItemDetail(props: { searchResult: youtube_v3.Schema$SearchResult }): JSX.Element {
  const snippet = props.searchResult.snippet;
  const search = props.searchResult;
  const videoId = search.id?.videoId;
  const desc = snippet?.description || "<no description>";
  const title = snippet?.title || "?";
  const thumbnailUrl = snippet?.thumbnails?.high?.url || undefined;
  const thumbnailMd = (thumbnailUrl ? `![thumbnail](${thumbnailUrl})` : "") + "\n\n";
  const publishedAt = snippet?.publishedAt || "?";
  const channel = snippet?.channelTitle || "?";
  const meta: string[] = [`Channel: ${channel}  `, `Published at: ${publishedAt}`];
  let md = `# ${title}\n\n${thumbnailMd}${desc}\n\n${meta.join("\n")}`;
  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <OpenVideoInBrowser videoId={videoId} />
          <OpenChannelInBrowser snippet={snippet} />
        </ActionPanel>
      }
    />
  );
}

export function VideoSearchListItem(props: { searchResult: youtube_v3.Schema$SearchResult }): JSX.Element {
  const snippet = props.searchResult.snippet;
  const search = props.searchResult;
  const videoId = search.id?.videoId;
  const publishedAt = snippet?.publishedAt || undefined;
  return (
    <List.Item
      key={search.id?.videoId?.toString()}
      title={snippet?.title || "?"}
      icon={snippet?.thumbnails?.high?.url || undefined}
      accessoryTitle={publishedAt}
      actions={
        <ActionPanel>
          <PushAction title="Show Details" target={<SnippetSearchListItemDetail searchResult={search} />} />
          <OpenVideoInBrowser videoId={videoId} />
        </ActionPanel>
      }
    />
  );
}

export default function VideoSearchList(props: { type: SearchType }) {
  const [searchText, setSearchText] = useState<string>();
  const { data, error, isLoading, fetcher } = useRefresher<
    GaxiosResponse<youtube_v3.Schema$SearchListResponse> | undefined
  >(
    async (updateInline: boolean) => {
      if (searchText) {
        return await youtubeClient.search.list({
          q: searchText,
          part: ["id", "snippet"],
          type: [props.type],
          maxResults: 50,
        });
      }
      return undefined;
    },
    [searchText]
  );
  if (error) {
    showToast(ToastStyle.Failure, "Could not search videos", getErrorMessage(error));
  }
  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} throttle={true}>
      {data?.data.items?.map((r) => (
        <VideoSearchListItem key={r.id?.videoId || r.id?.channelId} searchResult={r} />
      ))}
    </List>
  );
}
