import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { Artist } from "../common/types";
import { getImageUrl } from "../common/get-image-url";
import { APP_BASE_URL } from "../common/constants";

export function ArtistListItem({ artist }: { artist: Artist }) {
  const path = `${APP_BASE_URL}/artist/${artist.id}/${artist.slug}`;

  return (
    <List.Item
      key={artist.id}
      title={artist.name}
      icon={
        artist.image
          ? {
              mask: Image.Mask.Circle,
              source: getImageUrl({ image: artist.image, size: 50 }),
            }
          : {
              value: Icon.Music,
              tooltip: "Artist Image",
            }
      }
      detail={
        <List.Item.Detail
          markdown={`![Artwork](${getImageUrl({ image: artist.image, size: 175 })})`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Link title={"Artist"} text={artist.name} target={path} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel title={artist.name}>
          <Action.OpenInBrowser
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            title="Go to Artist"
            url={path}
          />
          <Action.CopyToClipboard content={path} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
        </ActionPanel>
      }
    />
  );
}
