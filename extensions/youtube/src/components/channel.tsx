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
  const thumbnailMd = (thumbnailUrl ? `![thumbnail](${thumbnailUrl})` : "") + "\n\n";
  const publishedAt = channel.publishedAt;
  const meta: string[] = [`Channel: ${channel.title}  `, `Published at: ${publishedAt}`];
  let md = `# ${title}\n\n${thumbnailMd}${desc}\n\n${meta.join("\n")}`;
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
