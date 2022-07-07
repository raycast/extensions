import { ActionPanel, Color, Detail, Icon, List, showToast, Action, Image, Toast } from "@raycast/api";
import React from "react";
import { compactNumberFormat, formatDate, getErrorMessage } from "../lib/utils";
import { Channel, getChannel, getPrimaryActionPreference, PrimaryAction, useRefresher } from "../lib/youtubeapi";
import {
  LogoutAction,
  OpenChannelInBrowser,
  SearchChannelVideosAction,
  ShowRecentPlaylistVideosAction,
} from "./actions";

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
    mdParts = [`# Channel: ${title}`];
    if (thumbnailUrl) {
      mdParts.push(`![thumbnail](${thumbnailUrl})`);
    }
    const meta: string[] = [`- Channelname: ${channel.title}  `, `- Published: ${formatDate(channel.publishedAt)}`];
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

  const mainActions = (): JSX.Element => {
    const showDetail = (
      <Action.Push
        title="Show Details"
        target={<ChannelListItemDetail channel={channel} />}
        icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
      />
    );
    const openBrowser = <OpenChannelInBrowser channelId={channelId} />;

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

  return (
    <List.Item
      key={channelId}
      title={channel.title}
      icon={{ source: thumbnail, mask: Image.Mask.Circle }}
      actions={
        <ActionPanel>
          {mainActions()}
          <SearchChannelVideosAction channelId={channelId} />
          <ShowRecentPlaylistVideosAction
            title="Show Recent Channel Videos"
            playlistId={channel.relatedPlaylists?.uploads}
          />
          <LogoutAction />
        </ActionPanel>
      }
      accessories={[
        {
          text: parts.join(" "),
        },
      ]}
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
    showToast({
      style: Toast.Style.Failure,
      title: "Error fetching channel info",
      message: getErrorMessage(error),
    });
  }
  return <ChannelListItemDetail channel={data} isLoading={isLoading} />;
}
