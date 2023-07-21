import {
  ActionPanel,
  Color,
  Detail,
  Icon,
  Image,
  List,
  Grid,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import React from "react";
import { compactNumberFormat, formatDate, getErrorMessage } from "../lib/utils";
import { Channel, getChannel, useRefresher } from "../lib/youtubeapi";
import { OpenChannelInBrowser, SearchChannelVideosAction, ShowRecentPlaylistVideosAction } from "./actions";
import { addRecentChannel, PinChannel, PinnedChannelActions, RecentChannelActions } from "./recent_channels";
import he from "he";
import { ViewLayout, PrimaryAction, Preferences } from "../lib/types";

export function ChannelItemDetail(props: { channel: Channel; isLoading?: boolean | undefined }): JSX.Element {
  const channel = props.channel;
  let statistics;
  let mdParts = [];
  if (channel) {
    statistics = channel.statistics;
    const desc = channel.description || "No description";
    const title = channel.title;
    const thumbnailUrl = channel.thumbnails?.default?.url || undefined;
    mdParts = [`# ${title}`];
    if (thumbnailUrl) {
      mdParts.push(`![thumbnail](${thumbnailUrl})`);
    }
    mdParts.push(`\n${desc}`);
  } else {
    mdParts = ["Error getting channel info"];
  }
  const md = mdParts.join("\n\n");
  return (
    <Detail
      isLoading={props.isLoading}
      markdown={md}
      metadata={
        channel && (
          <Detail.Metadata>
            {statistics && (
              <Detail.Metadata.Label
                title="Subscribers"
                text={compactNumberFormat(parseInt(statistics.subscriberCount))}
              />
            )}
            <Detail.Metadata.Label title="Published" text={formatDate(channel.publishedAt)} />
            <Detail.Metadata.Separator />
            {statistics && (
              <React.Fragment>
                <Detail.Metadata.Label
                  title="Number of Videos"
                  text={compactNumberFormat(parseInt(statistics.videoCount))}
                />
                <Detail.Metadata.Label title="View Count" text={compactNumberFormat(parseInt(statistics.viewCount))} />
              </React.Fragment>
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title="Open Channel in Browser"
              target={`https://youtube.com/channel/${channel.id}`}
              text={channel.title}
            />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <ShowRecentPlaylistVideosAction
            channelId={channel.id}
            title="Show Recent Channel Videos"
            playlistId={channel?.relatedPlaylists?.uploads}
          />
          <SearchChannelVideosAction channelId={channel.id} />
          <OpenChannelInBrowser channelId={channel.id} />
        </ActionPanel>
      }
    />
  );
}

interface ChannelItemProps {
  channel: Channel;
  refresh?: () => void;
  pinned?: boolean;
  recent?: boolean;
}

export function ChannelItem(props: ChannelItemProps): JSX.Element {
  const { view, primaryaction } = getPreferenceValues<Preferences>();
  const { channel, refresh } = props;
  const channelId = channel.id;
  const title = he.decode(channel.title);
  let parts: string[] = [];
  if (channel.statistics) {
    parts = [
      `${compactNumberFormat(parseInt(channel.statistics.subscriberCount))} subs · ${compactNumberFormat(
        parseInt(channel.statistics.viewCount),
      )} views`,
    ];
  }
  const thumbnail = channel.thumbnails?.high?.url || "";

  const Actions = (): JSX.Element => {
    const showDetail = (
      <Action.Push
        title="Show Details"
        target={<ChannelItemDetail {...props} />}
        icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
        onPush={() => {
          addRecentChannel(channel.id);
          if (refresh) refresh();
        }}
      />
    );
    const openBrowser = <OpenChannelInBrowser channelId={channel.id} refresh={refresh} />;
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {primaryaction === PrimaryAction.OpenInBrowser ? (
            <React.Fragment>
              {openBrowser}
              {showDetail}
            </React.Fragment>
          ) : (
            <React.Fragment>
              {showDetail}
              {openBrowser}
            </React.Fragment>
          )}
        </ActionPanel.Section>
        <ActionPanel.Section>
          <SearchChannelVideosAction channelId={channel.id} refresh={refresh} />
          <ShowRecentPlaylistVideosAction
            channelId={channel.id}
            refresh={refresh}
            title="Show Recent Channel Videos"
            playlistId={channel.relatedPlaylists?.uploads}
          />
        </ActionPanel.Section>
        {props.recent && <RecentChannelActions channelId={channel.id} refresh={refresh} />}
        {props.pinned ? (
          <PinnedChannelActions channelId={channel.id} refresh={refresh} />
        ) : (
          <PinChannel channelId={channel.id} refresh={refresh} />
        )}
      </ActionPanel>
    );
  };

  return view === ViewLayout.List ? (
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
