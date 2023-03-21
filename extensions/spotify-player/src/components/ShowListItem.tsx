import { List, ActionPanel, Action, Image, Icon } from "@raycast/api";
import { play } from "../spotify/client";
import { useSpotify } from "../utils/context";

export default function ShowListItem(props: { show: SpotifyApi.ShowObjectSimplified }) {
  const { installed } = useSpotify();

  const { show } = props;

  const title = show.name;
  const subtitle = show.publisher;
  const imageURL = show.images[show.images.length - 1]?.url;
  const icon: Image.ImageLike = {
    source: imageURL ?? Icon.BlankDocument,
    mask: Image.Mask.Circle,
  };

  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      accessories={[{ text: `${show.total_episodes} episodes`, tooltip: "number of episodes" }]}
      icon={icon}
      actions={
        <ActionPanel title={title}>
          <Action
            title="Play"
            icon={Icon.Play}
            onAction={() => {
              play(undefined, show.uri);
            }}
          />
          <Action.OpenInBrowser
            title={`Show The Show (${show.name.trim()})`}
            url={installed ? `spotify:show:${show.id}` : show.external_urls.spotify}
            icon={icon}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={show.external_urls.spotify}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
