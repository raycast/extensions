import { Action, ActionPanel, List, Toast, showToast } from "@raycast/api";
import { useMyPlaylists } from "./hooks/useMyPlaylists";
import { useCurrentlyPlaying } from "./hooks/useCurrentlyPlaying";
import { addToPlaylist } from "./api/addToPlaylist";
import { CreateQuicklink } from "./components/CreateQuicklink";
import { SimplifiedPlaylistObject } from "./helpers/spotify.api";
import { ListOrGridItem } from "./components/ListOrGridItem";

export default function Command() {
  const { myPlaylistsData, myPlaylistsIsLoading } = useMyPlaylists();
  const { currentlyPlayingData, currentlyPlayingIsLoading } = useCurrentlyPlaying();

  if (!currentlyPlayingData?.item || currentlyPlayingData.item.type !== "track") {
    return (
      <List isLoading={currentlyPlayingIsLoading}>
        <List.EmptyView title="No track is currently playing" />
      </List>
    );
  }

  const track = currentlyPlayingData.item;

  return (
    <List isLoading={myPlaylistsIsLoading || currentlyPlayingIsLoading}>
      {myPlaylistsData?.items?.map((playlist: SimplifiedPlaylistObject) => (
        <ListOrGridItem
          type="list"
          key={playlist.id}
          icon={playlist.images?.[0]?.url ? { source: playlist.images[0].url } : undefined}
          title={playlist.name || "Untitled Playlist"}
          accessories={[{ text: `${playlist.tracks?.total || 0} tracks` }]}
          actions={
            <ActionPanel>
              <Action
                title="Add Song"
                onAction={async () => {
                  if (!playlist.id || !track.uri) return;
                  await addToPlaylist({
                    playlistId: playlist.id,
                    trackUris: [track.uri],
                  });
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Added to Playlist",
                    message: `${track.name} was added to ${playlist.name}`,
                  });
                }}
              />
              {playlist.id && (
                <CreateQuicklink
                  title={`Create Quicklink to Add to ${playlist.name}`}
                  quicklinkTitle={`Add Playing Song to ${playlist.name}`}
                  command="addPlayingSongToPlaylist"
                  data={{ playlistId: playlist.id }}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
