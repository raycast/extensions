import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { EnhancedTrack } from "../common/types";
import { getImageUrl } from "../common/get-image-url";
import { APP_BASE_URL } from "../common/constants";

export function EnhancedTrackListItem({ track }: { track: EnhancedTrack }) {
  const { song, album } = track;
  const artists = track.song.artists ?? [];

  const songPath = `${APP_BASE_URL}/song/${track.id}/${song.slug}`;

  return (
    <List.Item
      key={track.id}
      title={song.name}
      icon={
        album.image
          ? {
              // mask: Image.Mask.RoundedRectangle,
              source: getImageUrl({ image: track.album.image, size: 50 }),
            }
          : {
              value: Icon.Music,
              tooltip: "Album Image",
            }
      }
      detail={
        <List.Item.Detail
          markdown={`![Artwork](${getImageUrl({ image: track.album.image, size: 175 })})`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Link title={"Song"} text={song.name} target={songPath} />
              <List.Item.Detail.Metadata.Separator />
              {artists.map((artist, index) => (
                <List.Item.Detail.Metadata.Link
                  key={artist.artist.name}
                  title={index === 0 ? "Artist" : ""}
                  text={artist.artist.name}
                  target={`${APP_BASE_URL}/artist/${artist.artist.id}/${artist.artist.slug}`}
                />
              ))}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link
                title={"Album"}
                text={album.name}
                target={`${APP_BASE_URL}/album/${album.id}/${album.slug}`}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel title={`${track.song.name}`}>
          <Action.OpenInBrowser
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            title="Go to Song"
            url={songPath}
          />
          <Action.CopyToClipboard content={songPath} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
        </ActionPanel>
      }
    />
  );
}
