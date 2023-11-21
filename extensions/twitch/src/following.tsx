import { Color, Icon, List } from "@raycast/api";

import millify from "millify";
import { action } from "./helpers/action";
import { formatDate, getUpTime } from "./helpers/datetime";
import { renderDetails } from "./helpers/renderDetails";
import useUserId from "./helpers/useUserId";
import useFollowedStreams from "./helpers/useFollowedStreams";
import { useFrecencySorting } from "@raycast/utils";

export default function main() {
  const { data: userId, isLoading: isLoadingUserId } = useUserId();
  const { data: items, isLoading: isLoadingStreams } = useFollowedStreams(userId);

  const loading = isLoadingUserId || isLoadingStreams;

  const { data: sortedItems, visitItem } = useFrecencySorting(items, {
    key: (item) => item.id,
  });

  return (
    <List
      isShowingDetail
      isLoading={loading}
      searchBarPlaceholder="Search for a Streamer on Twitch"
      navigationTitle="Search a Channel"
      filtering
    >
      {sortedItems.map((item) => {
        return (
          <List.Item
            key={item.id}
            accessories={[{ tag: item.type === "live" ? item.game_name : "Offline" }]}
            detail={
              <List.Item.Detail
                markdown={renderDetails(item)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title={item.title} />
                    <List.Item.Detail.Metadata.Label title="Channel Name" text={item.user_name} />
                    <List.Item.Detail.Metadata.Label
                      title="Category"
                      text={item.game_name}
                      icon={{ source: Icon.Box, tintColor: Color.Purple }}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Viewer Count"
                      text={millify(item.viewer_count)}
                      icon={{ source: Icon.Person, tintColor: Color.Red }}
                    />

                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Started At"
                      text={formatDate(item.started_at)}
                      icon={{ source: Icon.Clock, tintColor: Color.Blue }}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Stream Uptime"
                      text={getUpTime(item.started_at)}
                      icon={{ source: Icon.Clock, tintColor: Color.Blue }}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Language"
                      text={item.language}
                      icon={{ source: Icon.SpeechBubble, tintColor: Color.Yellow }}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Content Type"
                      text={item.is_mature ? "Mature Content" : "PG"}
                      icon={{ source: Icon.Eye, tintColor: item.is_mature ? Color.Red : Color.Green }}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            id={item.id}
            title={item.user_name}
            actions={action(item.user_name, true, () => visitItem(item))}
          />
        );
      })}
    </List>
  );
}
