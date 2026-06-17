import { Action, ActionPanel, Detail, Icon, Image, List, useNavigation } from "@raycast/api";
import { useEpisodes } from "./hooks/useEpisodes";
import { formatDuration } from "./utils";

interface Props {
  feed: string;
  onPlay: (title: string, url: string) => Promise<string>;
}

export default function Command({ feed, onPlay }: Props) {
  const { pop } = useNavigation();

  const { data, isLoading, error } = useEpisodes(feed);

  if (error) {
    return <Detail markdown={`${error}`} />;
  }

  return (
    <List isLoading={isLoading} navigationTitle="Search Episodes" searchBarPlaceholder="Search your favorite episode">
      {data?.map((item) => (
        <List.Item
          key={item.guid}
          icon={{
            source: item.itunes?.image || "",
            fallback: Icon.Livestream,
            mask: Image.Mask.RoundedRectangle,
          }}
          title={item.title}
          subtitle={formatDuration(item["itunes:duration"])}
          accessories={[{ date: new Date(item.pubDate) }]}
          actions={
            <ActionPanel>
              <Action
                title="Play"
                onAction={() => {
                  onPlay(item.title, item.enclosure.url);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
