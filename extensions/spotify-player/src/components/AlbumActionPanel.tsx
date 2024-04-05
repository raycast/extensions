import { Action, ActionPanel, Icon, popToRoot, showHUD } from "@raycast/api";
import { SimplifiedAlbumObject } from "../helpers/spotify.api";
import { FooterAction } from "./FooterAction";
import { PlayAction } from "./PlayAction";
import { TracksList } from "./TracksList";
import { getErrorMessage } from "../helpers/getError";
import { addToMySavedAlbums } from "../api/addToMySavedAlbums";
import { removeFromMySavedAlbums } from "../api/removeFromMySavedAlbums";

type AlbumActionPanelProps = { album: SimplifiedAlbumObject };

export function AlbumActionPanel({ album }: AlbumActionPanelProps) {
  const title = album.name;

  return (
    <ActionPanel>
      <PlayAction id={album.id} type="album" />
      <Action.Push
        icon={Icon.AppWindowList}
        title="Show Songs"
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        target={<TracksList album={album} showGoToAlbum={false} />}
      />
      <Action
        icon={Icon.Plus}
        title="Add To Library"
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        onAction={async () => {
          try {
            await addToMySavedAlbums({
              albumIds: album.id ? [album.id] : [],
            });
            await showHUD("Album added to the library");
            await popToRoot();
            return;
          } catch (err) {
            const error = getErrorMessage(err);
            await showHUD(error);
          }
        }}
      />
      <Action
        icon={Icon.Minus}
        title="Remove From Library"
        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        onAction={async () => {
          try {
            await removeFromMySavedAlbums({
              albumIds: album.id ? [album.id] : [],
            });
            await showHUD("Album removed from the library");
            await popToRoot();
            return;
          } catch (err) {
            const error = getErrorMessage(err);
            await showHUD(error);
          }
        }}
      />
      <FooterAction url={album?.external_urls?.spotify} uri={album.uri} title={title} />
    </ActionPanel>
  );
}
