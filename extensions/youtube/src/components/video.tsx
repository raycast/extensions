import { ActionPanel, Detail, List, OpenInBrowserAction, PushAction } from "@raycast/api";
import { compactNumberFormat } from "../lib/utils";
import { Video } from "../lib/youtubeapi";
import { OpenChannelInBrowser } from "./actions";

function OpenVideoInBrowser(props: { videoId: string | null | undefined }): JSX.Element | null {
  const videoId = props.videoId;
  if (videoId) {
    return <OpenInBrowserAction title="Open Video in Browser" url={`https://youtube.com/watch?v=${videoId}`} />;
  }
  return null;
}

export function VideoListItemDetail(props: { video: Video }): JSX.Element {
  const video = props.video;
  const videoId = video.id;
  const desc = video.description || "<no description>";
  const title = video.title;
  const thumbnailUrl = video.thumbnails?.high?.url || undefined;
  const thumbnailMd = (thumbnailUrl ? `![thumbnail](${thumbnailUrl})` : "") + "\n\n";
  const publishedAt = video.publishedAt;
  const channel = video.channelTitle;
  const meta: string[] = [`Channel: ${channel}  `, `Published at: ${publishedAt}`];
  let md = `# ${title}\n\n${thumbnailMd}${desc}\n\n${meta.join("\n")}`;
  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <OpenVideoInBrowser videoId={videoId} />
          <OpenChannelInBrowser channelId={video.channelId} />
        </ActionPanel>
      }
    />
  );
}

export function VideoListItem(props: { video: Video }): JSX.Element {
  const video = props.video;
  const videoId = video.id;
  let parts: string[] = [];
  if (video.statistics) {
    parts = [`${compactNumberFormat(parseInt(video.statistics.viewCount))} 👀`];
  }
  const thumbnail = video.thumbnails?.high?.url || "";

  return (
    <List.Item
      key={videoId}
      title={video.title}
      icon={{ source: thumbnail }}
      accessoryTitle={parts.join(" ")}
      actions={
        <ActionPanel>
          <PushAction title="Show Details" target={<VideoListItemDetail video={video} />} />
          <OpenVideoInBrowser videoId={videoId} />
        </ActionPanel>
      }
    />
  );
}
