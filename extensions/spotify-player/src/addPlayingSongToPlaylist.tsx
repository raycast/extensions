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
import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "./components/View";
import { PlaylistPicker } from "./components/PlaylistPicker";
import { useCurrentlyPlaying } from "./hooks/useCurrentlyPlaying";
import { addToPlaylist } from "./api/addToPlaylist";
import { playlistContainsTrack } from "./api/playlistContainsTrack";

type LaunchContextData = { playlistId?: string };

function AddToPlaylistCommand({ playlistId }: LaunchContextData) {
  const { currentlyPlayingData, currentlyPlayingIsLoading } = useCurrentlyPlaying();
  const started = useRef(false);
  const busy = useRef(false);
  const completed = useRef(false);
  const [canRetry, setCanRetry] = useState(false);
  const uri = currentlyPlayingData?.item?.uri;
  const { duplicateSongCheck } = getPreferenceValues<Preferences.AddPlayingSongToPlaylist>();

  const add = useCallback(
    async function add(allowDuplicate = false) {
      if (!playlistId || !uri || currentlyPlayingIsLoading || busy.current || completed.current) return;
      busy.current = true;
      setCanRetry(false);
      try {
        if (!allowDuplicate && duplicateSongCheck && (await playlistContainsTrack(playlistId, uri))) {
          await showToast({
            title: "Duplicate found",
            style: Toast.Style.Failure,
            primaryAction: { title: "Add to playlist anyways", onAction: () => add(true) },
          });
          return;
        }
        await addToPlaylist({ playlistId, trackUris: [uri] });
        completed.current = true;
        await showHUD("Added to playlist");
        await popToRoot();
      } catch (error) {
        // Only an explicit retry starts another attempt; a render must not repeat a failed mutation.
        setCanRetry(!completed.current);
        await showToast({ title: "Error adding song to playlist", message: String(error), style: Toast.Style.Failure });
      } finally {
        busy.current = false;
      }
    },
    [playlistId, uri, currentlyPlayingIsLoading, duplicateSongCheck],
  );

  useEffect(() => {
    if (!playlistId || !uri || currentlyPlayingIsLoading || started.current) return;
    started.current = true;
    void add();
  }, [playlistId, uri, currentlyPlayingIsLoading, add]);

  if (!uri || playlistId) {
    return (
      <List isLoading={currentlyPlayingIsLoading}>
        <List.EmptyView
          title={playlistId && uri ? "Add to playlist" : "Nothing is playing right now"}
          actions={
            <ActionPanel>
              {canRetry && <Action title="Retry Adding to Playlist" onAction={() => add()} />}
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
