import { View } from "./components/View";
import {
  Action,
  ActionPanel,
  Icon,
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
import { addToPlaylist } from "./api/addToPlaylist";
import { useMyPlaylists } from "./hooks/useMyPlaylists";
import { getError } from "./helpers/getError";
import { CreateQuicklink } from "./components/CreateQuicklink";
import getAllPlaylistItems from "./helpers/getAllPlaylistItems";
import addTrackToPlaylistCache from "./helpers/addTrackToPlaylistCache";

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
              />
              <Action
                title="Search"
                icon={Icon.MagnifyingGlass}
                onAction={() => launchCommand({ name: "search", type: LaunchType.UserInitiated })}
              />
              <Action
                icon={Icon.Repeat}
                title="Refresh"
                onAction={async () => {
                  currentlyPlayingRevalidate();
                }}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  useEffect(() => {
    if (props?.playlistId) {
      try {
        addToPlaylist({
          playlistId: props.playlistId,
          trackUris: [currentlyPlayingData.item?.uri as string],
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
      return;
    }
  }, []);

  return (
    <List
      searchBarPlaceholder="Search for Playlist"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={true}
    >
      <ListOrGridSection type="list" title="Playlists">
        {myPlaylistsData?.items
          ?.filter((playlist) => playlist.owner?.id === meData?.id)
          .map((playlist) => (
            <PlaylistItem
              type="list"
              key={playlist.id}
              playlist={playlist}
              actions={
                <ActionPanel>
                  <Action
                    key={playlist.id}
                    icon={Icon.Plus}
                    title="Add Current Song to Playlist"
                    onAction={async () => {
                      if (playlist.id === undefined) {
                        showToast({
                          title: "Error adding song to playlist",
                          message: "Playlist ID undefined",
                          style: Toast.Style.Failure,
                        });
                        return;
                      }
                      try {
                        const addTrack = async () => {
                          await addToPlaylist({
                            playlistId: playlist.id!,
                            trackUris: [currentlyPlayingData.item?.uri as string],
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
                          let isInPlaylist = false;

                          for (const uri of playlistItems) {
                            if (uri === currentlyPlayingData.item?.uri) {
                              isInPlaylist = true;
                              break;
                            }
                          }

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
