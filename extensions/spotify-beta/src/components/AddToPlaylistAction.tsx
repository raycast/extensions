import { Action, ActionPanel, Icon, popToRoot, showHUD, showToast } from "@raycast/api";
import { addToPlaylist } from "../api/addToPlaylist";
import { PrivateUserObject, SimplifiedPlaylistObject } from "../helpers/spotify.api";

type AddToPlaylistActionProps = {
  playlists: SimplifiedPlaylistObject[];
  meData: PrivateUserObject;
  uri: string;
  closeWindowOnAction?: boolean;
};

export function AddToPlaylistAction({ playlists, meData, uri, closeWindowOnAction }: AddToPlaylistActionProps) {
  return (
    <ActionPanel.Submenu icon={Icon.List} title="Add to Playlist">
      {playlists
        ?.filter((playlist) => playlist.owner?.id === meData?.id || playlist.collaborative)
        .map((playlist) => {
          return (
            <Action
              key={playlist.id}
              title={playlist.name as string}
              onAction={async () => {
                await addToPlaylist({
                  playlistId: playlist.id as string,
                  trackUris: [uri as string],
                });
                if (closeWindowOnAction) {
                  await showHUD(`Added to ${playlist.name}`);
                  await popToRoot();
                  return;
                }
                await showToast({ title: `Added to ${playlist.name}` });
              }}
            />
          );
        })}
    </ActionPanel.Submenu>
  );
}
