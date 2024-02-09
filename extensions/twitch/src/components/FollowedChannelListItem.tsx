import millify from "millify";
import type { ComponentProps } from "react";
import { memo, useMemo } from "react";

import type { Image } from "@raycast/api";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

import { primaryActionBrowser, primaryActionStreamlink } from "@/helpers/action";
import { formatDate, formatLongAgo, getUpTime } from "@/helpers/datetime";
import { renderDetails } from "@/helpers/renderDetails";
import useChannelDetails from "@/hooks/useChannelDetails";
import useChannelVideos from "@/hooks/useChannelVideos";
import type { FollowedChannel } from "@/interfaces/FollowedChannel";
import type { FollowedStreams } from "@/interfaces/FollowedStreams";
import type { Video } from "@/interfaces/Video";

import BrowserActions from "./FollowedChannelListItem/BrowserActions";
import StreamLinkActions from "./FollowedChannelListItem/StreamLinkActions";
import VideoList from "./VideoList";

export type ItemAccessory = Exclude<ComponentProps<typeof List.Item>["accessories"], null | undefined>[number];

function FollowedChannelListItemF({
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

  const { archives, highlights, uploads } = useMemo(
    () => ({
      archives: videos.filter((video) => video.type === "archive"),
      highlights: videos.filter((video) => video.type === "highlight"),
      uploads: videos.filter((video) => video.type === "upload"),
    }),
    [videos],
  );

  const first = useMemo<{
    archive: Video | undefined;
    highlight: Video | undefined;
    upload: Video | undefined;
  }>(
    () => ({
      archive: archives[0],
      highlight: highlights[0],
      upload: uploads[0],
    }),
    [archives, highlights, uploads],
  );

  const video = useMemo(() => archives[0] || highlights[0] || uploads[0], [archives, highlights, uploads]);

  const accessories = useMemo<ItemAccessory[]>(() => {
    if (live) {
      return [{ icon: { source: Icon.CircleFilled, tintColor: Color.Red }, text: "Live" }];
    }
    if (video) {
      return [{ icon: { source: Icon.Video }, text: "VOD" }];
    }
    return [];
  }, [live, video]);

  const titleIcon: Image.ImageLike | undefined = useMemo(
    () =>
      live
        ? { source: Icon.CircleFilled, tintColor: Color.Red }
        : video
          ? { source: Icon.Video, tintColor: Color.SecondaryText }
          : undefined,
    [live, video],
  );

  const viewerCount = useMemo(() => (live ? live.viewer_count : video ? video.view_count : 0), [live, video]);
  const markdown = useMemo(
    () => (live ? renderDetails(live) : video ? renderDetails(video) : undefined),
    [live, video],
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
          {primaryActionBrowser ? (
            <BrowserActions channel={channel} live={live} onAction={onAction} first={first} />
          ) : null}
          {<StreamLinkActions channel={channel} live={live} onAction={onAction} first={first} />}
          {primaryActionStreamlink ? (
            <BrowserActions channel={channel} live={live} onAction={onAction} first={first} />
          ) : null}
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

const FollowedChannelListItem = memo(FollowedChannelListItemF);

export default FollowedChannelListItem;
