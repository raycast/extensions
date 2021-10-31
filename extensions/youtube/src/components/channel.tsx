import { ActionPanel, Detail, List, OpenInBrowserAction, PushAction } from "@raycast/api";
import { compactNumberFormat } from "../lib/utils";
import { Channel } from "../lib/youtubeapi";
import { OpenChannelInBrowser } from "./actions";

export function ChannelListItemDetail(props: { channel: Channel }): JSX.Element {
  const channel = props.channel;
  const channelId = channel.id;
  const desc = channel.description || "<no description>";
  const title = channel.title;
  const thumbnailUrl = channel.thumbnails?.high?.url || undefined;
  const publishedAt = new Date(channel.publishedAt);
  let mdParts = [`# Channel: ${title}`];
  if (thumbnailUrl) {
    mdParts.push(`![thumbnail](${thumbnailUrl})`);
  }
  const meta: string[] = [`- Channelname: ${channel.title}  `, `- Published at: ${publishedAt.toLocaleDateString("en-US")}`];
  mdParts = mdParts.concat([desc, meta.join("\n")]);
  if (channel.statistics) {
    const cs = channel.statistics;
    const stats = [`- Videos: ${cs.videoCount}`, `- Views: ${compactNumberFormat(parseInt(cs.viewCount))}`];
    mdParts.push(`## Statistics\n\n ${stats.join("\n")}`);
  }
  const md = mdParts.join("\n\n");
  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
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
      icon={{ source: thumbnail }}
      accessoryTitle={parts.join(" ")}
      actions={
        <ActionPanel>
          <PushAction title="Show Details" target={<ChannelListItemDetail channel={channel} />} />
          <OpenChannelInBrowser channelId={channelId} />
        </ActionPanel>
      }
    />
  );
}
