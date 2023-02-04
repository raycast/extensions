import { Action, ActionPanel, Detail, Image, List, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { play } from "./apple-music";
import { useEpisodesFetch as useEpisodes } from "./hooks/useEpisodes";
import { formatDuration } from "./utils";

export default function Command({ feed }: { feed: string }) {
  const [isLoading, setIsLoading] = useState(false);

  const { data, isLoading: isFeedLoading, error } = useEpisodes(feed);

  if (error) {
    return <Detail markdown={`${error}`} />;
  }

  const onPlay = async (title: string, url: string) => {
    setIsLoading(true);
    await showToast({
      title: "Waiting...",
      style: Toast.Style.Animated,
    });
    await play(title, url);
    await showToast({
      title: "Playing",
      message: title,
      style: Toast.Style.Success,
    });
    setIsLoading(false);
    popToRoot();
  };

  return (
    <List
      isLoading={isLoading || isFeedLoading}
      navigationTitle="Search Episodes"
      searchBarPlaceholder="Search your favorite episode"
    >
      {data?.map((item) => (
        <List.Item
          key={item.guid}
          icon={{
            source: item.image?.url || "",
            mask: Image.Mask.RoundedRectangle,
          }}
          title={item.title}
          subtitle={formatDuration(item["itunes:duration"])}
          accessories={[{ date: new Date(item.pubDate) }]}
          actions={
            <ActionPanel>
              <Action title="Play" onAction={async () => await onPlay(item.title, item.enclosure.url)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
