import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Image,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { addToPlaylist } from "../api/addToPlaylist";
import { removeFromPlaylist } from "../api/removeFromPlaylist";
import addTrackToPlaylistCache from "../helpers/addTrackToPlaylistCache";
import removeTrackFromPlaylistCache from "../helpers/removeTrackFromPlaylistCache";
import { TrackObject } from "../helpers/spotify.api";
import { getError } from "../helpers/getError";
import { PrivateUserObject, SimplifiedPlaylistObject } from "../helpers/spotify.api";
import { usePlaylistsContainingTrack } from "../hooks/usePlaylistsContainingTrack";
import { AddToPlaylist } from "../shortcuts/shortcuts";

type AddToPlaylistActionProps = {
  playlists: SimplifiedPlaylistObject[];
  meData: PrivateUserObject;
  uri: string;
};

export function AddToPlaylistAction({ playlists, meData, uri }: AddToPlaylistActionProps) {
  const { closeWindowOnAction } = getPreferenceValues<{ closeWindowOnAction?: boolean }>();

  const ownedPlaylists = playlists.filter((p) => p.owner?.id === meData?.id);

  const { playlistsContainingTrack, playlistsContainingTrackRevalidate } = usePlaylistsContainingTrack({
    playlists: ownedPlaylists,
    trackUri: uri,
    options: { execute: ownedPlaylists.length > 0 && !!uri },
  });

  return (
    <ActionPanel.Submenu icon={Icon.List} title="Add to Playlist" shortcut={AddToPlaylist}>
      {ownedPlaylists.map((playlist, index) => {
        if (!playlist.id || !playlist.name) return null;
        const alreadyAdded = playlistsContainingTrack.includes(playlist.id);
        const imageURL = playlist.images?.[0]?.url;

        return (
          <Action
            key={`${playlist.id}-${index}`}
            title={playlist.name}
            icon={
              alreadyAdded
                ? { source: Icon.Checkmark, tintColor: Color.Green }
                : imageURL
                  ? { source: imageURL, mask: Image.Mask.RoundedRectangle }
                  : Icon.List
            }
            onAction={async () => {
              try {
                if (alreadyAdded) {
                  await removeFromPlaylist({
                    playlistId: playlist.id!,
                    trackUris: [{ uri }],
                  });
                  await removeTrackFromPlaylistCache(playlist.id!, uri);
                  if (closeWindowOnAction) {
                    await showHUD(`Removed from ${playlist.name}`);
                    await popToRoot();
                    return;
                  }
                  await showToast({ title: `Removed from ${playlist.name}` });
                  playlistsContainingTrackRevalidate();
                } else {
                  await addToPlaylist({
                    playlistId: playlist.id!,
                    trackUris: [uri],
                  });
                  await addTrackToPlaylistCache(playlist.id!, { uri } as TrackObject);
                  if (closeWindowOnAction) {
                    await showHUD(`Added to ${playlist.name}`);
                    await popToRoot();
                    return;
                  }
                  await showToast({ title: `Added to ${playlist.name}` });
                  playlistsContainingTrackRevalidate();
                }
              } catch (err) {
                const error = getError(err);
                await showToast({
                  title: "Error",
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
