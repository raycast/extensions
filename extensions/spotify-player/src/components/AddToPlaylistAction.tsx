import { Action, ActionPanel, getPreferenceValues, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { addToPlaylist } from "../api/addToPlaylist";
import { getError } from "../helpers/getError";
import { PrivateUserObject, SimplifiedPlaylistObject } from "../helpers/spotify.api";

type AddToPlaylistActionProps = {
  playlists: SimplifiedPlaylistObject[];
  meData: PrivateUserObject;
  uri: string;
};

export function AddToPlaylistAction({ playlists, meData, uri }: AddToPlaylistActionProps) {
  const { closeWindowOnAction } = getPreferenceValues<{ closeWindowOnAction?: boolean }>();

  return (
    <ActionPanel.Submenu icon={Icon.List} title="Add to Playlist">
      {playlists
        ?.filter((playlist) => playlist.owner?.id === meData?.id)
        .map((playlist) => {
          return (
            <Action
              key={playlist.id}
              title={playlist.name as string}
              onAction={async () => {
                try {
                  await addToPlaylist({
                    playlistId: playlist.id as string,
                    trackUris: [uri],
                  });
                  if (closeWindowOnAction) {
                    await showHUD(`Added to ${playlist.name}`);
                    await popToRoot();
                    return;
                  }
                  await showToast({ title: `Added to ${playlist.name}` });
                } catch (err) {
                  const error = getError(err);
                  await showToast({
                    title: "Error adding song to playlist",
                    message: error.message,
                    style: Toast.Style.Failure,
                  });
                }
              }}
            />
          );
        })}
    </ActionPanel.Submenu>
  );
}
