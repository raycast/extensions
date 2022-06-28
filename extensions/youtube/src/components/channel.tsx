import { ActionPanel, Color, Detail, Icon, Image, List, Grid, Action, showToast, Toast } from "@raycast/api";
import React from "react";
import { compactNumberFormat, formatDate, getErrorMessage } from "../lib/utils";
import { Channel, getChannel, getPrimaryActionPreference, PrimaryAction, useRefresher } from "../lib/youtubeapi";
import { OpenChannelInBrowser, SearchChannelVideosAction, ShowRecentPlaylistVideosAction } from "./actions";
import { getViewLayout } from "./listgrid";
import he from "he";

export function ChannelItemDetail(props: {
  channel: Channel;
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
    mdParts = [`# Channel: ${title}`];
    if (thumbnailUrl) {
      mdParts.push(`![thumbnail](${thumbnailUrl})`);
    }
    const meta: string[] = [`* Channelname: ${channel.title}  `, `* Published: ${formatDate(channel.publishedAt)}`];
    mdParts = mdParts.concat([desc, meta.join("\n")]);
    if (channel.statistics) {
      const cs = channel.statistics;
      const stats = [`* Videos: ${cs.videoCount}`, `* Views: ${compactNumberFormat(parseInt(cs.viewCount))}`];
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
            channel={channel}
            title="Show Recent Channel Videos"
            playlistId={channel?.relatedPlaylists?.uploads}
          />
          <SearchChannelVideosAction channel={channel} />
          <OpenChannelInBrowser channelId={channel.id} channel={channel} />
        </ActionPanel>
      }
    />
  );
}

export function ChannelItem(props: { channel: Channel; actions?: JSX.Element | undefined }): JSX.Element {
  const channel = props.channel;
  const channelId = channel.id;
  const title = he.decode(channel.title);
  let parts: string[] = [];
  if (channel.statistics) {
    parts = [
      `${compactNumberFormat(parseInt(channel.statistics.subscriberCount))} subs · ${compactNumberFormat(
        parseInt(channel.statistics.viewCount)
      )} views`,
    ];
  }
  const thumbnail = channel.thumbnails?.high?.url || "";

  const mainActions = (): JSX.Element => {
    const showDetail = (
      <Action.Push
        title="Show Details"
        target={<ChannelItemDetail channel={channel} />}
        icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
      />
    );
    const openBrowser = <OpenChannelInBrowser channelId={channel.id} channel={channel} />;

    if (getPrimaryActionPreference() === PrimaryAction.Browser) {
      return (
        <React.Fragment>
          {openBrowser}
          {showDetail}
        </React.Fragment>
      );
    } else {
      return (
        <React.Fragment>
          {showDetail}
          {openBrowser}
        </React.Fragment>
      );
    }
  };

  const Actions = (): JSX.Element => {
    return (
      <ActionPanel>
        <ActionPanel.Section>{mainActions()}</ActionPanel.Section>
        <ActionPanel.Section>
          <SearchChannelVideosAction channel={channel} />
          <ShowRecentPlaylistVideosAction
            channel={channel}
            title="Show Recent Channel Videos"
            playlistId={channel.relatedPlaylists?.uploads}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          {props.actions}
        </ActionPanel.Section>
      </ActionPanel>
    )
  }

  return getViewLayout() === "list" ? (
    <List.Item
      key={channelId}
      title={title}
      icon={{ source: thumbnail, mask: Image.Mask.Circle }}
      accessories={[{ text: parts.join(" ") }]}
      actions={<Actions />}
    />
  ) : (
    <Grid.Item
      key={channelId}
      title={title}
      content={{ source: thumbnail, mask: Image.Mask.Circle }}
      subtitle={parts.join(" ")}
      actions={<Actions />}
    />
  );
}

export function ChannelItemDetailFetched(props: { channelId: string }): JSX.Element | null {
  const channelId = props.channelId;
  const { data, error, isLoading } = useRefresher<Channel | undefined>(async () => {
    if (channelId) {
      return await getChannel(channelId);
    }
    return undefined;
  }, [channelId]);
  if (error) {
    showToast(Toast.Style.Failure, "Error fetching channel info", getErrorMessage(error));
  }
  return data ? <ChannelItemDetail channel={data} isLoading={isLoading} /> : null; 
}
