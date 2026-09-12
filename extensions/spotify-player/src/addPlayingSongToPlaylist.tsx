import { View } from "./components/View";
import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  LaunchProps,
  LaunchType,
  List,
  Toast,
  getPreferenceValues,
  launchCommand,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useCurrentlyPlaying } from "./hooks/useCurrentlyPlaying";
import { useMe } from "./hooks/useMe";
import { ListOrGridSection } from "./components/ListOrGridSection";
import PlaylistItem from "./components/PlaylistItem";
import { usePlaylistsContainingTrack } from "./hooks/usePlaylistsContainingTrack";
import { addToPlaylist } from "./api/addToPlaylist";
import { removeFromPlaylist } from "./api/removeFromPlaylist";
import { useMyPlaylists } from "./hooks/useMyPlaylists";
import { getError } from "./helpers/getError";
import { CreateQuicklink } from "./components/CreateQuicklink";
import getAllPlaylistItems from "./helpers/getAllPlaylistItems";
import addTrackToPlaylistCache from "./helpers/addTrackToPlaylistCache";
import removeTrackFromPlaylistCache from "./helpers/removeTrackFromPlaylistCache";
import { Like, OpenLibrary, OpenSearch } from "./shortcuts/shortcuts";

type LaunchContextData = {
  playlistId?: string;
};

type AddToPlaylistCommandProps = {
  playlistId?: string;
};

type AddToPlaylistCommandPreferences = {
  duplicateSongCheck: boolean;
};

const preferences: AddToPlaylistCommandPreferences = getPreferenceValues();
const DUPLICATE_SONG_CHECK = preferences.duplicateSongCheck;

function AddToPlaylistCommand(props: AddToPlaylistCommandProps) {
  const { currentlyPlayingData, currentlyPlayingIsLoading, currentlyPlayingRevalidate } = useCurrentlyPlaying();
  const [searchText, setSearchText] = useState("");

  const { myPlaylistsData } = useMyPlaylists();
  const { meData } = useMe();

  const ownedPlaylists = myPlaylistsData?.items?.filter((p) => p.owner?.id === meData?.id) ?? [];
  const { playlistsContainingTrack } = usePlaylistsContainingTrack({
    playlists: ownedPlaylists,
    trackUri: currentlyPlayingData?.item?.uri,
    options: { execute: ownedPlaylists.length > 0 && !!currentlyPlayingData?.item?.uri },
  });

  if (!currentlyPlayingData || !currentlyPlayingData.item) {
    return (
      <List isLoading={currentlyPlayingIsLoading}>
        <List.EmptyView
          icon={Icon.Music}
          title="Nothing is playing right now"
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Book}
                title="Your Library"
                onAction={() => launchCommand({ name: "yourLibrary", type: LaunchType.UserInitiated })}
                shortcut={OpenLibrary}
              />
              <Action
                title="Search"
                icon={Icon.MagnifyingGlass}
                onAction={() => launchCommand({ name: "search", type: LaunchType.UserInitiated })}
                shortcut={OpenSearch}
              />
              <Action
                icon={Icon.Repeat}
                title="Refresh"
                onAction={async () => {
                  currentlyPlayingRevalidate();
                }}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  useEffect(() => {
    if (props?.playlistId && currentlyPlayingData?.item?.uri && !currentlyPlayingIsLoading) {
      const addToPlaylistAsync = async () => {
        try {
          await addToPlaylist({
            playlistId: props.playlistId!,
            trackUris: [currentlyPlayingData.item.uri!],
          });
          const playlist = myPlaylistsData?.items?.find((p) => p.id == props.playlistId);
          if (!playlist) {
            showHUD("Playlist not found");
            popToRoot();
            return;
          }
          showHUD(`Added to ${playlist?.name}`);
        } catch (err) {
          const error = getError(err);
          showHUD(`Error adding song to playlist: ${error.message}`);
        }
        popToRoot();
      };

      addToPlaylistAsync();
    }
  }, [props?.playlistId, currentlyPlayingData?.item?.uri, currentlyPlayingIsLoading]);

  return (
    <List
      searchBarPlaceholder="Search for Playlist"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={true}
      isLoading={currentlyPlayingIsLoading}
    >
      <ListOrGridSection type="list" title="Playlists">
        {ownedPlaylists.map((playlist) => {
          const alreadyAdded = !!playlist.id && playlistsContainingTrack.includes(playlist.id);
          return (
            <PlaylistItem
              type="list"
              key={playlist.id}
              playlist={playlist}
              alreadyAdded={alreadyAdded}
              actions={
                <ActionPanel>
                  <Action
                    key={playlist.id}
                    icon={alreadyAdded ? Icon.Minus : Icon.Plus}
                    title={alreadyAdded ? "Remove from Playlist" : "Add Current Song to Playlist"}
                    onAction={async () => {
                      if (currentlyPlayingIsLoading) {
                        showToast({
                          title: "Please wait",
                          message: "Fetching currently playing track",
                          style: Toast.Style.Failure,
                        });
                        return;
                      }

                      if (!playlist.id) {
                        showToast({
                          title: "Error",
                          message: "Playlist ID undefined",
                          style: Toast.Style.Failure,
                        });
                        return;
                      }

                      const trackUri = currentlyPlayingData.item?.uri as string;

                      if (alreadyAdded) {
                        try {
                          await removeFromPlaylist({
                            playlistId: playlist.id!,
                            trackUris: [{ uri: trackUri }],
                          });
                          await removeTrackFromPlaylistCache(playlist.id!, trackUri);
                          await showHUD(`Removed from ${playlist.name}`);
                          await popToRoot();
                        } catch (err) {
                          const error = getError(err);
                          await showToast({
                            title: "Error removing song",
                            message: error.message,
                            style: Toast.Style.Failure,
                          });
                        }
                        return;
                      }

                      try {
                        const addTrack = async () => {
                          await addToPlaylist({
                            playlistId: playlist.id!,
                            trackUris: [trackUri],
                          });
                          await addTrackToPlaylistCache(playlist.id!, currentlyPlayingData.item);
                          await showHUD(`Added to ${playlist.name}`);
                          await popToRoot();
                        };

                        if (DUPLICATE_SONG_CHECK) {
                          await showToast({
                            title: "Checking for duplicates",
                            style: Toast.Style.Animated,
                          });

                          const playlistItems = await getAllPlaylistItems(playlist);
                          const isInPlaylist = playlistItems.some((uri) => uri === trackUri);

                          if (isInPlaylist) {
                            await showToast({
                              title: "Duplicate found",
                              style: Toast.Style.Failure,
                              primaryAction: {
                                async onAction() {
                                  await addTrack();
                                },
                                title: "Add to playlist anyways",
                              },
                            });
                            return;
                          }
                        }

                        await addTrack();
                      } catch (err) {
                        const error = getError(err);
                        await showToast({
                          title: "Error adding song to playlist",
                          message: error.message,
                          style: Toast.Style.Failure,
                        });
                      }
                    }}
                    shortcut={Like}
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
          );
        })}
      </ListOrGridSection>
    </List>
  );
}

export default function Command(props: LaunchProps<{ launchContext: LaunchContextData }>) {
  const playlistId = props?.launchContext?.playlistId;
  return (
    <View>
      <AddToPlaylistCommand playlistId={playlistId} />
    </View>
  );
}
