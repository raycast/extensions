import { memo, useMemo } from "react";

import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";

import useLoadMoreChannelVideos from "@/hooks/useLoadMoreChannelVideos";
import type { FollowedChannel } from "@/interfaces/FollowedChannel";
import type { FollowedStreams } from "@/interfaces/FollowedStreams";
import type { Video } from "@/interfaces/Video";

import LiveListItem from "./LiveListItem";
import VideoListItem from "./VideoListItem";

function VideoListF({
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

  const noVideos = useMemo(() => !live && !videos.length, [live, videos]);

  const allVideos = useMemo(
    () => [...videos, ...moreVideos].filter((v) => !live || v.stream_id !== live.id),
    [videos, moreVideos, live],
  );

  const { pop } = useNavigation();

  return (
    <List
      isShowingDetail
      filtering
      searchBarPlaceholder={`Search ${channel.broadcaster_name} videos`}
      navigationTitle={`Search ${channel.broadcaster_name} videos`}
    >
      {noVideos ? (
        <List.Item
          title="No video found"
          actions={
            <ActionPanel>
              <Action title="Back to List of Followed Channels" onAction={pop} />
            </ActionPanel>
          }
        />
      ) : null}
      {live ? <LiveListItem live={live} onAction={onAction} /> : null}
      {allVideos.map((video) => (
        <VideoListItem key={video.id} video={video} onAction={onAction} />
      ))}
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

const VideoList = memo(VideoListF);

export default VideoList;
