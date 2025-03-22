import { Action, ActionPanel, Detail, Icon, List, useNavigation } from "@raycast/api";
import { includes, reject } from "lodash";
import { useEffect, useState } from "react";

import { useStatus } from "./hooks/useStatus";
import { PlayerState, statusMapping, togglePause, forward, rewind, play } from "./apple-music";
import { formatProgress } from "./utils";
import ManagePodcast from "./manage-podcast";
import PodcastItem from "./podcast-item";
import { usePodcastFeeds } from "./hooks/usePodcasts";
import { SearchFeeds } from "./search-feeds";

export default function Command() {
  const { push } = useNavigation();
  const { data: statusData, revalidate: revalidateStatus, isLoading: isStatusLoading } = useStatus();
  const { data: feeds, isLoading: isPodcastsLoading, revalidate: revalidateFeeds, error } = usePodcastFeeds();
  const [removedFeeds, setRemovedFeeds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isStatusLoading) {
      setIsLoading(isStatusLoading);
    }
  }, [isStatusLoading]);

  if (error) {
    return <Detail markdown={`${error}`} />;
  }

  const filteredList = reject(feeds, (feed) => includes(removedFeeds, feed));

  const progress = statusData ? formatProgress(statusData.position, statusData.time) : "";
  const statusTitle = statusMapping.titles[statusData?.state || PlayerState.stopped];
  const controlActionWithRevalidateStatus = (action: () => Promise<string>) => {
    return async () => {
      setIsLoading(true);
      const result = await action();
      revalidateStatus();
      return result;
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
              <Action
                icon={Icon.PlusCircle}
                title="Add Podcast"
                onAction={() => push(<SearchFeeds onSubmitted={revalidateFeeds} />)}
              />
              <Action
                icon={Icon.Cog}
                title="Manage Podcasts"
                onAction={() => push(<ManagePodcast onSubmitted={revalidateFeeds} />)}
              />
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
          icon={isPlayerLoading ? Icon.CircleProgress : statusMapping.icons[statusData?.state || PlayerState.stopped]}
          title={isPlayerLoading ? "Loading..." : statusTitle}
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
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={controlActionWithRevalidateStatus(rewind)}
                />
                <Action
                  icon={Icon.PlusCircle}
                  title="Add Podcast"
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => push(<SearchFeeds onSubmitted={revalidateFeeds} />)}
                />
                <Action
                  icon={Icon.Cog}
                  title="Manage Podcasts"
                  shortcut={{ modifiers: ["cmd"], key: "," }}
                  onAction={() => push(<ManagePodcast onSubmitted={revalidateFeeds} />)}
                />
              </ActionPanel>
            )
          }
        />
      </List.Section>
      <List.Section title="Podcasts">
        {filteredList.map((feed) => (
          <PodcastItem
            key={feed}
            feed={feed}
            onRemovePodcast={(feed) => setRemovedFeeds((prev) => [...prev, feed])}
            onPlay={(title, feed) => controlActionWithRevalidateStatus(() => play(title, feed))()}
            onClick={push}
            onAddPodcastSubmitted={revalidateFeeds}
          />
        ))}
      </List.Section>
    </List>
  );
}
