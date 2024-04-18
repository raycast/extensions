import { View } from "./components/View";
import {
  Action,
  ActionPanel,
  Icon,
  LaunchType,
  List,
  Toast,
  launchCommand,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import { useState } from "react";
import { useCurrentlyPlaying } from "./hooks/useCurrentlyPlaying";
import { useMe } from "./hooks/useMe";
import { ListOrGridSection } from "./components/ListOrGridSection";
import PlaylistItem from "./components/PlaylistItem";
import { addToPlaylist } from "./api/addToPlaylist";
import { useMyPlaylists } from "./hooks/useMyPlaylists";
import { getError } from "./helpers/getError";

function AddToPlaylistCommand() {
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
  return (
    <List
      searchBarPlaceholder="Search for Playlist"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={true}
    >
      <ListOrGridSection type={"list"} title="Playlists">
        {myPlaylistsData?.items
          ?.filter((playlist) => playlist.owner?.id === meData?.id)
          .map((playlist) => (
            <PlaylistItem
              type={"list"}
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
                        await addToPlaylist({
                          playlistId: playlist.id,
                          trackUris: [currentlyPlayingData.item?.uri as string],
                        });
                        await showHUD(`Added to ${playlist.name}`);
                        await popToRoot();
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
                </ActionPanel>
              }
            />
          ))}
      </ListOrGridSection>
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <AddToPlaylistCommand />
    </View>
  );
}
