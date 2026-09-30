import { Action, ActionPanel, Color, Icon, Image, List, useNavigation } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { type ComponentProps } from "react";

import useFollowedStreams from "./helpers/useFollowedStreams";
import useFollowedChannels from "./helpers/useFollowedChannels";
import useChannelVideos from "./helpers/useChannelVideos";
import useLoadMoreChannelVideos from "./helpers/useLoadMoreChannelVideos";
import useChannelDetails from "./helpers/useChannelDetails";
import { useUserId } from "./helpers/useUserId";

import { FollowedStreams } from "./interfaces/FollowedStreams";
import { Video } from "./interfaces/Video";
import { FollowedChannel } from "./interfaces/FollowedChannel";

import millify from "millify";
import { action, primaryActionStreamlink, ActionWatchStream, primaryActionBrowser } from "./helpers/action";
import { formatDate, formatISODuration, formatLongAgo, getUpTime } from "./helpers/datetime";
import { renderDetails } from "./helpers/renderDetails";

type ItemAccessory = Exclude<ComponentProps<typeof List.Item>["accessories"], null | undefined>[number];

function VideoListItem({ video, onAction }: { video: Video; onAction?: () => void }) {
  const type =
    video.type === "archive"
      ? "VOD"
      : video.type === "highlight"
        ? "Highlight"
        : video.type === "upload"
          ? "Upload"
          : "Video";
  const icon =
    video.type === "archive"
      ? Icon.Video
      : video.type === "highlight"
        ? Icon.Bolt
        : video.type === "upload"
          ? Icon.FilmStrip
          : Icon.Video;

  const accessoryIcon = { source: icon };
  const accessoryText = type;
  const browserAction = (
    <Action.OpenInBrowser title={`Open ${type} in Browser`} url={video.url} onOpen={onAction} icon={accessoryIcon} />
  );
  const streamlinkAction = (
    <ActionWatchStream title={`Watch ${type}`} name={video.url} onAction={onAction} icon={accessoryIcon} />
  );

  return (
    <List.Item
      id={video.id}
      title={video.title}
      subtitle={video.description}
      accessories={[{ icon: accessoryIcon, text: accessoryText }]}
      detail={
        <List.Item.Detail
          markdown={renderDetails(video)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={video.title} />
              <List.Item.Detail.Metadata.Label title="Type" icon={accessoryIcon} text={accessoryText} />
              <List.Item.Detail.Metadata.Label
                title="Duration"
                text={formatISODuration(video.duration)}
                icon={{ source: Icon.Clock, tintColor: Color.Blue }}
              />
              <List.Item.Detail.Metadata.Label
                title="Published On"
                text={formatLongAgo(video.published_at)}
                icon={{ source: Icon.Clock, tintColor: Color.Blue }}
              />
              {video.description && <List.Item.Detail.Metadata.Label title={video.description} />}

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label
                title="Viewer Count"
                text={millify(video.view_count)}
                icon={{ source: Icon.Person, tintColor: Color.Red }}
              />
              <List.Item.Detail.Metadata.Label
                title="Language"
                text={video.language}
                icon={{ source: Icon.SpeechBubble, tintColor: Color.Yellow }}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {primaryActionBrowser && browserAction}
          {streamlinkAction}
          {primaryActionStreamlink && browserAction}
        </ActionPanel>
      }
    />
  );
}

function LiveListItem({ live, onAction }: { live: FollowedStreams; onAction?: () => void }) {
  const typeAccessory = { icon: { source: Icon.CircleFilled, tintColor: Color.Red }, text: "Live" };
  return (
    <List.Item
      id={live.id}
      title={live.title}
      accessories={[typeAccessory]}
      actions={action(live.user_login, true, onAction)}
      detail={
        <List.Item.Detail
          markdown={renderDetails(live)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={live.title} />
              <List.Item.Detail.Metadata.Label title="Type" {...typeAccessory} />
              <List.Item.Detail.Metadata.Label
                title="Started At"
                text={formatDate(live.started_at)}
                icon={{ source: Icon.Clock, tintColor: Color.Blue }}
              />
              <List.Item.Detail.Metadata.Label
                title="Stream Uptime"
                text={getUpTime(live.started_at)}
                icon={{ source: Icon.Clock, tintColor: Color.Blue }}
              />
              <List.Item.Detail.Metadata.Label
                title="Category"
                text={live.game_name}
                icon={{ source: Icon.Box, tintColor: Color.Purple }}
              />

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label
                title="Viewer Count"
                text={millify(live.viewer_count)}
                icon={{ source: Icon.Person, tintColor: Color.Red }}
              />
              <List.Item.Detail.Metadata.Label
                title="Language"
                text={live.language}
                icon={{ source: Icon.SpeechBubble, tintColor: Color.Yellow }}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

function VideoList({
  channel,
  videos,
  live,
  cursor,
  onAction,
}: {
  channel: FollowedChannel;
  videos: Video[];
  live: FollowedStreams | undefined;
  cursor: string | undefined;
  onAction?: () => void;
}) {
  const { hasMore, loadMore, isLoading, videos: moreVideos } = useLoadMoreChannelVideos(channel.broadcaster_id, cursor);

  const { pop } = useNavigation();

  return (
    <List
      isShowingDetail
      filtering
      searchBarPlaceholder={`Search ${channel.broadcaster_name} videos`}
      navigationTitle={`Search ${channel.broadcaster_name} videos`}
    >
      {!live && !videos.length && (
        <List.Item
          title="No video found"
          actions={
            <ActionPanel>
              <Action title="Back to List of Followed Channels" onAction={pop} />
            </ActionPanel>
          }
        />
      )}
      {live && <LiveListItem live={live} onAction={onAction} />}
      {[...videos, ...moreVideos].map(
        (video) =>
          (!live || video.stream_id !== live.id) && <VideoListItem key={video.id} video={video} onAction={onAction} />,
      )}
      {hasMore && (
        <List.Item
          title={isLoading ? "Loading..." : "Load more"}
          accessories={[isLoading ? { icon: Icon.CircleEllipsis } : { icon: Icon.ArrowDownCircle }]}
          actions={
            <ActionPanel>
              <Action
                title="Load More"
                onAction={() => {
                  if (isLoading) return;
                  loadMore();
                }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function FollowedChannelListItem({
  channel,
  live,
  onAction,
}: {
  channel: FollowedChannel;
  live: FollowedStreams | undefined;
  onAction?: () => void;
}) {
  const { data: info } = useChannelDetails(channel.broadcaster_id);

  const { videos, cursor } = useChannelVideos(channel.broadcaster_id);

  const archives = videos.filter((video) => video.type === "archive");
  const highlights = videos.filter((video) => video.type === "highlight");
  const uploads = videos.filter((video) => video.type === "upload");

  const video = archives[0] || highlights[0] || uploads[0];

  const accessories: ItemAccessory[] = [];
  if (live) {
    accessories.push({ icon: { source: Icon.CircleFilled, tintColor: Color.Red }, text: "Live" });
  } else if (video) {
    accessories.push({ icon: { source: Icon.Video }, text: "VOD" });
  }

  const titleIcon: Image.ImageLike | undefined = live
    ? { source: Icon.CircleFilled, tintColor: Color.Red }
    : video
      ? { source: Icon.Video, tintColor: Color.SecondaryText }
      : undefined;

  const viewerCount = live ? live.viewer_count : video ? video.view_count : 0;

  const markdown = live ? renderDetails(live) : video ? renderDetails(video) : undefined;

  const browserActions = (
    <ActionPanel.Section>
      {live && (
        <Action.OpenInBrowser
          title="Open Live Stream in Browser"
          url={`https://twitch.tv/${channel.broadcaster_login}`}
          onOpen={onAction}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Red }}
        />
      )}
      {archives?.[0] && (
        <Action.OpenInBrowser
          title="Open Latest VOD in Browser"
          url={archives[0].url}
          onOpen={onAction}
          icon={Icon.Video}
        />
      )}
      {highlights?.[0] && (
        <Action.OpenInBrowser
          title="Open Latest Highlight in Browser"
          url={highlights[0].url}
          onOpen={onAction}
          icon={Icon.Bolt}
        />
      )}
      {uploads?.[0] && (
        <Action.OpenInBrowser
          title="Open Latest Upload in Browser"
          url={uploads[0].url}
          onOpen={onAction}
          icon={Icon.FilmStrip}
        />
      )}
      {!live && (
        <Action.OpenInBrowser
          title="Open Channel in Browser"
          url={`https://twitch.tv/${channel.broadcaster_login}`}
          onOpen={onAction}
        />
      )}
    </ActionPanel.Section>
  );

  const streamLinkActions = (
    <ActionPanel.Section>
      {live && (
        <ActionWatchStream
          title="Watch Live Stream"
          name={channel.broadcaster_login}
          onAction={onAction}
          icon={Icon.Eye}
        />
      )}
      {archives?.[0] && (
        <ActionWatchStream title="Watch latest VOD" name={archives[0].url} onAction={onAction} icon={Icon.Video} />
      )}
      {highlights?.[0] && (
        <ActionWatchStream
          title="Watch latest Highlight"
          name={highlights[0].url}
          onAction={onAction}
          icon={Icon.Bolt}
        />
      )}
      {uploads?.[0] && (
        <ActionWatchStream
          title="Watch latest Upload"
          name={uploads[0].url}
          onAction={onAction}
          icon={Icon.FilmStrip}
        />
      )}
    </ActionPanel.Section>
  );

  return (
    <List.Item
      id={channel.broadcaster_id}
      title={channel.broadcaster_name}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title={info.title || channel.broadcaster_name}
                icon={titleIcon}
                text={live ? "Live now" : undefined}
              />
              <List.Item.Detail.Metadata.Label title="Channel Name" text={channel.broadcaster_login} />
              <List.Item.Detail.Metadata.Label
                title="Category"
                text={info.game_name}
                icon={{ source: Icon.Box, tintColor: Color.Purple }}
              />

              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Viewer Count"
                text={{
                  value: millify(viewerCount),
                  color: viewerCount === 0 ? Color.SecondaryText : Color.PrimaryText,
                }}
                icon={{ source: Icon.Person, tintColor: viewerCount === 0 ? Color.SecondaryText : Color.Red }}
              />

              {live && (
                <>
                  <List.Item.Detail.Metadata.Label
                    title="Started At"
                    text={formatDate(live.started_at)}
                    icon={{ source: Icon.Clock, tintColor: Color.Blue }}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Stream Uptime"
                    text={getUpTime(live.started_at)}
                    icon={{ source: Icon.Clock, tintColor: Color.Blue }}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Content Type"
                    text={live.is_mature ? "Mature Content" : "PG"}
                    icon={{ source: Icon.Eye, tintColor: live.is_mature ? Color.Red : Color.Green }}
                  />
                </>
              )}

              {!live && video && (
                <>
                  <List.Item.Detail.Metadata.Label
                    title="Published On"
                    text={formatLongAgo(video.published_at)}
                    icon={{ source: Icon.Clock, tintColor: Color.Blue }}
                  />
                  {Boolean(archives?.length) && (
                    <List.Item.Detail.Metadata.Label
                      title="VOD Archives"
                      text={String(archives.length)}
                      icon={{ source: Icon.Video, tintColor: Color.SecondaryText }}
                    />
                  )}
                  {Boolean(highlights?.length) && (
                    <List.Item.Detail.Metadata.Label
                      title="VOD Highlights"
                      text={String(highlights.length)}
                      icon={{ source: Icon.Bolt, tintColor: Color.SecondaryText }}
                    />
                  )}
                  {Boolean(uploads?.length) && (
                    <List.Item.Detail.Metadata.Label
                      title="VOD Uploads"
                      text={String(uploads.length)}
                      icon={{ source: Icon.FilmStrip, tintColor: Color.SecondaryText }}
                    />
                  )}
                </>
              )}

              {Boolean(info.tags?.length && List.Item.Detail.Metadata.TagList) && (
                <List.Item.Detail.Metadata.TagList title="Tags">
                  {info.tags?.map((tag) => <List.Item.Detail.Metadata.TagList.Item text={tag} key={tag} />)}
                </List.Item.Detail.Metadata.TagList>
              )}
              <List.Item.Detail.Metadata.Label
                title="Language"
                text={info.broadcaster_language}
                icon={{ source: Icon.SpeechBubble, tintColor: Color.Yellow }}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            target={<VideoList channel={channel} videos={videos} live={live} cursor={cursor} onAction={onAction} />}
            title="Show All VODs"
            icon={Icon.MagnifyingGlass}
          />
          {primaryActionBrowser && browserActions}
          {streamLinkActions}
          {primaryActionStreamlink && browserActions}
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open Chat"
              url={`https://twitch.tv/${channel.broadcaster_login}/chat?popout=`}
              icon={Icon.SpeechBubble}
              onOpen={onAction}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Main() {
  const { data: userId, isLoading: isLoadingUserId } = useUserId();
  const { data: channels, isLoading: isLoadingChannels } = useFollowedChannels(userId);
  const { data: lives = [] } = useFollowedStreams(userId);

  const { data: sortedChannels, visitItem } = useFrecencySorting(channels, {
    key: (item) => item.broadcaster_id,
  });

  return (
    <List
      isShowingDetail
      isLoading={(isLoadingUserId || isLoadingChannels) && channels.length === 0}
      searchBarPlaceholder="Search followed channels"
      navigationTitle="Search Followed Channels"
      filtering
    >
      {sortedChannels.map((channel) => (
        <FollowedChannelListItem
          channel={channel}
          live={lives.find((live) => live.user_id === channel.broadcaster_id)}
          key={channel.broadcaster_id}
          onAction={() => visitItem(channel)}
        />
      ))}
    </List>
  );
}
