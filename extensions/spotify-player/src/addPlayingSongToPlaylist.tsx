import {
  Action,
  ActionPanel,
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
import { useEffect, useRef } from "react";
import { View } from "./components/View";
import { PlaylistPicker } from "./components/PlaylistPicker";
import { useCurrentlyPlaying } from "./hooks/useCurrentlyPlaying";
import { addToPlaylist } from "./api/addToPlaylist";
import { playlistContainsTrack } from "./api/playlistContainsTrack";

type LaunchContextData = { playlistId?: string };

function AddToPlaylistCommand({ playlistId }: LaunchContextData) {
  const { currentlyPlayingData, currentlyPlayingIsLoading } = useCurrentlyPlaying();
  const started = useRef(false);
  const uri = currentlyPlayingData?.item?.uri;
  const { duplicateSongCheck } = getPreferenceValues<Preferences.AddPlayingSongToPlaylist>();

  useEffect(() => {
    if (!playlistId || !uri || currentlyPlayingIsLoading || started.current) return;
    started.current = true;
    let adding = false;
    const add = async () => {
      try {
        const performAdd = async () => {
          if (adding) return;
          adding = true;
          try {
            await addToPlaylist({ playlistId, trackUris: [uri] });
            await showHUD("Added to playlist");
            await popToRoot();
          } catch (error) {
            await showToast({
              title: "Error adding song to playlist",
              message: String(error),
              style: Toast.Style.Failure,
            });
          } finally {
            adding = false;
          }
        };
        if (duplicateSongCheck && (await playlistContainsTrack(playlistId, uri))) {
          await showToast({
            title: "Duplicate found",
            style: Toast.Style.Failure,
            primaryAction: { title: "Add to playlist anyways", onAction: performAdd },
          });
          return;
        }
        await performAdd();
      } catch (error) {
        await showToast({ title: "Error adding song to playlist", message: String(error), style: Toast.Style.Failure });
      }
    };
    void add();
  }, [playlistId, uri, currentlyPlayingIsLoading, duplicateSongCheck]);

  if (!uri || playlistId) {
    return (
      <List isLoading={currentlyPlayingIsLoading}>
        <List.EmptyView
          title={playlistId && uri ? "Add to playlist" : "Nothing is playing right now"}
          actions={
            <ActionPanel>
              <Action
                title="Your Library"
                onAction={() => launchCommand({ name: "yourLibrary", type: LaunchType.UserInitiated })}
              />
              <Action
                title="Search"
                onAction={() => launchCommand({ name: "search", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  return <PlaylistPicker uri={uri} quicklinks />;
}

export default function Command(props: LaunchProps<{ launchContext: LaunchContextData }>) {
  return (
    <View>
      <AddToPlaylistCommand playlistId={props.launchContext?.playlistId} />
    </View>
  );
}
