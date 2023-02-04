import { Action, ActionPanel, Detail, Icon, Image, List, LocalStorage, useNavigation } from "@raycast/api";
import { includes, lowerCase, reject } from "lodash";
import { useState } from "react";

import { PODCASTS_FEEDS_KEY } from "./constants";
import { usePodcasts } from "./hooks/usePodcasts";
import EpisodeList from "./episode-list";
import { useStatus } from "./hooks/useStatus";
import { PlayerState, statusMapping, togglePause, forward, rewind } from "./apple-music";
import { formatProgress } from "./utils";
import AddPodcast from "./add-podcast";

export default function Command() {
  const { push } = useNavigation();
  const { data: statusData, revalidate: revalidateStatus, isLoading: isStatusLoading } = useStatus();
  const { data, isLoading: isPodcastsLoading, error } = usePodcasts();
  const [removedFeeds, setRemovedFeeds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  if (error) {
    return <Detail markdown={`${error}`} />;
  }

  const filteredList = reject(data, (podcast) => includes(removedFeeds, podcast.feedUrl));

  const removePodcast = async (feed: string) => {
    const feedsValue = await LocalStorage.getItem(PODCASTS_FEEDS_KEY);
    if (typeof feedsValue !== "string") return;

    const newFeeds = JSON.parse(feedsValue).filter((url: string) => url !== feed);
    await LocalStorage.setItem(PODCASTS_FEEDS_KEY, JSON.stringify(newFeeds));
    setRemovedFeeds((prev) => [...prev, feed]);
  };

  const progress = statusData ? formatProgress(statusData.position, statusData.time) : "";
  const statusTitle = statusMapping.titles[statusData?.state || PlayerState.stopped];
  const controlActionWithRevalidateStatus = (action: () => Promise<unknown> | unknown) => {
    return async () => {
      setIsLoading(true);
      await action();
      revalidateStatus();
      setIsLoading(false);
    };
  };

  const trackName = statusData?.name || "";

  const isPlayerLoading = isLoading || isStatusLoading;

  if (filteredList.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Cog}
          title="No podcasts"
          description="Please manage your subscribed podcasts first."
          actions={
            <ActionPanel>
              <Action icon={Icon.Cog} title="Manage Podcasts" onAction={() => push(<AddPodcast />)} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading || isPodcastsLoading || isStatusLoading}
      navigationTitle="Search Podcasts"
      searchBarPlaceholder="Search your subscribed podcasts"
    >
      <List.Section title="Player">
        <List.Item
          icon={statusMapping.icons[statusData?.state || PlayerState.stopped]}
          title={isPlayerLoading ? "Waiting..." : statusTitle}
          subtitle={trackName}
          accessories={[{ text: progress }]}
          actions={
            isPlayerLoading ? null : (
              <ActionPanel title="Player Control">
                <Action
                  icon={statusData?.state === PlayerState.paused ? Icon.Play : Icon.Pause}
                  title={statusData?.state === PlayerState.paused ? "Resume" : "Pause"}
                  onAction={controlActionWithRevalidateStatus(togglePause)}
                />
                <Action
                  icon={Icon.RotateClockwise}
                  title="Forward 15s"
                  onAction={controlActionWithRevalidateStatus(forward)}
                />
                <Action
                  icon={Icon.RotateAntiClockwise}
                  title="Rewind 15s"
                  onAction={controlActionWithRevalidateStatus(rewind)}
                />
                <Action icon={Icon.Cog} title="Manage Podcasts" onAction={() => push(<AddPodcast />)} />
              </ActionPanel>
            )
          }
        />
      </List.Section>
      <List.Section title="Podcasts">
        {filteredList.map((item) => {
          return (
            <List.Item
              id={item.feedUrl}
              key={item.feedUrl}
              icon={{
                source: item?.itunes?.image || "",
                mask: Image.Mask.RoundedRectangle,
              }}
              title={{ value: item.title, tooltip: item.description }}
              subtitle={item.description}
              actions={
                <ActionPanel>
                  <Action.Push icon={Icon.Livestream} title="Episodes" target={<EpisodeList feed={item.feedUrl} />} />
                  <Action
                    icon={Icon.Trash}
                    title="Unsubscribe"
                    onAction={() => removePodcast(item.feedUrl)}
                    style={Action.Style.Destructive}
                  />
                  <Action icon={Icon.Cog} title="Manage Podcasts" onAction={() => push(<AddPodcast />)} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
