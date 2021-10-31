import { ActionPanel, Color, Detail, Icon, ImageMask, List, PushAction, showToast, ToastStyle } from "@raycast/api";
import { compactNumberFormat, getErrorMessage } from "../lib/utils";
import { Channel, getChannel, useRefresher } from "../lib/youtubeapi";
import { OpenChannelInBrowser, SearchChannelVideosAction, ShowRecentPlaylistVideosAction } from "./actions";

export function ChannelListItemDetail(props: {
  channel: Channel | undefined;
  isLoading?: boolean | undefined;
}): JSX.Element {
  const channel = props.channel;
  let channelId: string | undefined;
  let mdParts = [];
  if (channel) {
    channelId = channel.id;
    const desc = channel.description || "<no description>";
    const title = channel.title;
    const thumbnailUrl = channel.thumbnails?.default?.url || undefined;
    const publishedAt = new Date(channel.publishedAt);
    mdParts = [`# Channel: ${title}`];
    if (thumbnailUrl) {
      mdParts.push(`![thumbnail](${thumbnailUrl})`);
    }
    const meta: string[] = [
      `- Channelname: ${channel.title}  `,
      `- Published at: ${publishedAt.toLocaleDateString("en-US")}`,
    ];
    mdParts = mdParts.concat([desc, meta.join("\n")]);
    if (channel.statistics) {
      const cs = channel.statistics;
      const stats = [`- Videos: ${cs.videoCount}`, `- Views: ${compactNumberFormat(parseInt(cs.viewCount))}`];
      mdParts.push(`## Statistics\n\n ${stats.join("\n")}`);
    }
  } else {
    mdParts = ["Error getting channel info"];
  }
  const md = mdParts.join("\n\n");
  return (
    <Detail
      isLoading={props.isLoading}
      markdown={md}
      actions={
        <ActionPanel>
          <ShowRecentPlaylistVideosAction
            title="Show Recent Channel Videos"
            playlistId={channel?.relatedPlaylists?.uploads}
          />
          <SearchChannelVideosAction channelId={channelId} />
          <OpenChannelInBrowser channelId={channelId} />
        </ActionPanel>
      }
    />
  );
}

export function ChannelListItem(props: { channel: Channel }): JSX.Element {
  const channel = props.channel;
  const channelId = channel.id;
  let parts: string[] = [];
  if (channel.statistics) {
    parts = [`${compactNumberFormat(parseInt(channel.statistics.subscriberCount))} 🧑`];
  }
  const thumbnail = channel.thumbnails?.high?.url || "";

  return (
    <List.Item
      key={channelId}
      title={channel.title}
      icon={{ source: thumbnail, mask: ImageMask.Circle }}
      accessoryTitle={parts.join(" ")}
      actions={
        <ActionPanel>
          <PushAction
            title="Show Details"
            target={<ChannelListItemDetail channel={channel} />}
            icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
          />
          <SearchChannelVideosAction channelId={channelId} />
          <ShowRecentPlaylistVideosAction
            title="Show Recent Channel Videos"
            playlistId={channel.relatedPlaylists?.uploads}
          />
          <OpenChannelInBrowser channelId={channelId} />
        </ActionPanel>
      }
    />
  );
}

export function ChannelListItemDetailFetched(props: { channelId: string }): JSX.Element {
  const channelId = props.channelId;
  const { data, error, isLoading } = useRefresher<Channel | undefined>(async () => {
    if (channelId) {
      return await getChannel(channelId);
    }
    return undefined;
  }, [channelId]);
  if (error) {
    showToast(ToastStyle.Failure, "Error fetching channel info", getErrorMessage(error));
  }
  return <ChannelListItemDetail channel={data} isLoading={isLoading} />;
}
