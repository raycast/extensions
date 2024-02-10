import { useCallback, useMemo } from "react";

import { List } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";

import FollowedChannelListItem from "@/components/FollowedChannelListItem";
import useFollowedChannels from "@/hooks/useFollowedChannels";
import useFollowedStreams from "@/hooks/useFollowedStreams";
import { useUserId } from "@/hooks/useUserId";

export default function Main() {
  const { data: userId, isLoading: isLoadingUserId } = useUserId();
  const { channels, isLoading: isLoadingChannels } = useFollowedChannels(userId);
  const { data: lives = [], isLoading: isLoadingFollowed } = useFollowedStreams(userId);
  const { data: sortedChannels, visitItem } = useFrecencySorting(channels, {
    key: (item) => item.broadcaster_id,
  });

  const isLoading = useMemo(
    () => (isLoadingUserId || isLoadingChannels || isLoadingFollowed) && channels.length === 0,
    [isLoadingUserId, isLoadingChannels, isLoadingFollowed, channels.length],
  );

  const getLive = useCallback((channelId: string) => lives.find((live) => live.user_id === channelId), [lives]);

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder="Search followed channels"
      navigationTitle="Search Followed Channels"
      filtering
    >
      {sortedChannels.map((channel) => (
        <FollowedChannelListItem
          channel={channel}
          live={getLive(channel.broadcaster_id)}
          key={channel.broadcaster_id}
          onAction={() => visitItem(channel)}
        />
      ))}
    </List>
  );
}
