import { AI, Action, ActionPanel, Icon, LaunchProps, List, Toast, environment, showToast } from "@raycast/api";
import { showFailureToast, useCachedState, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { View } from "./components/View";
import TrackListItem from "./components/TrackListItem";
import { createPlaylist } from "./api/createPlaylist";
import { addToPlaylist } from "./api/addToPlaylist";
import { play } from "./api/play";
import { addToQueue } from "./api/addTrackToQueue";
import { skipToNext } from "./api/skipToNext";
import { TrackObject } from "./helpers/spotify.api";
import { generatePlaylistFromPrompt } from "./helpers/generatePlaylistFromPrompt";
import { TuneHistoryList } from "./components/TuneHistoryList";

type ErrorState = {
  message: string;
  failedPrompt: string;
};

export type Playlist = {
  name: string;
  description: string;
  tracks: TrackObject[];
  prompt: string;
};

export default function Command(props: LaunchProps<{ arguments: Arguments.GeneratePlaylist }>) {
  const [searchText, setSearchText] = useState("");
  const [generationError, setGenerationError] = useState<ErrorState | null>(null);
  const [history, setHistory] = useState<Playlist[]>([]);
  const [historyArchiveById, setHistoryArchiveById] = useCachedState<Record<string, Playlist[]>>(
    "spotify-player-historyArchive",
    {},
  );

  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [tuningPrompt, setTuningPrompt] = useState("");

  useEffect(() => {
    const id = history[0]?.name;
    // If no id, do nothing it means no playlist generated yet
    if (!id) return;
    const existingHistory = historyArchiveById[id];
    // if the already registered history is the same as current, do nothing
    if (existingHistory && existingHistory.length === history.length) return;
    setHistoryArchiveById((prev) => ({ ...prev, [id]: history }));
  }, [history, setHistoryArchiveById]);

  // Use usePromise for playlist generation
  // We use tuningPrompt as an argument to re-execute the promise when the tuning prompt changes
  const { isLoading, revalidate } = usePromise(
    async (tuningPrompt: string) => {
      console.log("Starting playlist generation...");

      if (!environment.canAccess(AI)) {
        showFailureToast("You don't have access to Pro.", { title: "Cannot Generate Playlist" });
        throw new Error("No AI access");
      }

      // If we have a tuning prompt, use it to tune the existing playlist
      if (tuningPrompt.trim() !== "") {
        console.log("Tuning playlist with prompt:", tuningPrompt);
        return await generatePlaylistFromPrompt(tuningPrompt, history);
      }

      // If we don't have a tuning prompt, use the initial prompt from the arguments
      const initialPrompt = props.arguments.description;
      if (!initialPrompt) {
        return;
      }
      console.log("Generating playlist with prompt:", initialPrompt);
      return await generatePlaylistFromPrompt(initialPrompt);
    },
    [tuningPrompt],
    {
      onError: (err) => {
        showFailureToast(err.message, { title: "Could not generate playlist" });
        setGenerationError({ message: err.message, failedPrompt: tuningPrompt });
        setSearchText(tuningPrompt);
      },
      onData: async (playlist) => {
        if (!playlist) return;
        setCurrentPlaylist(playlist);
        setHistory((prev) => [...prev, playlist]);
        setSearchText("");
      },
      // We only want to execute on initial prompt presence or tuning prompt change
      execute: props.arguments.description !== undefined || tuningPrompt.trim() !== "",
    },
  );

  // Memorize current index in history
  const currentIndex = useMemo(() => {
    if (!currentPlaylist) return -1;
    return history.indexOf(currentPlaylist);
  }, [currentPlaylist, history]);

  async function tunePlaylist(prompt: string) {
    if (!prompt.trim()) return;
    if (!currentPlaylist) return;
    if (prompt.trim().toLowerCase() === currentPlaylist.prompt.trim().toLowerCase()) return;

    setTuningPrompt(prompt);
  }

  function revertToPrevious() {
    if (currentIndex > 0) {
      setCurrentPlaylist(history[currentIndex - 1]);
      showToast({ style: Toast.Style.Success, title: "Reverted to previous version" });
    }
  }

  function redoNext() {
    if (currentIndex < history.length - 1) {
      setCurrentPlaylist(history[currentIndex + 1]);
      setGenerationError(null);
      showToast({ style: Toast.Style.Success, title: "Restored next version" });
    }
  }

  function jumpToVersion(index: number) {
    if (index >= 0 && index < history.length) {
      setCurrentPlaylist(history[index]);
      setGenerationError(null);
      showToast({ style: Toast.Style.Success, title: `Jumped to version ${index + 1}` });
    }
  }

  async function addPlaylistToSpotify() {
    if (!currentPlaylist) return;
    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding playlist to Spotify" });
      const spotifyPlaylist = await createPlaylist({
        name: currentPlaylist.name,
        description: currentPlaylist.description,
      });
      if (spotifyPlaylist?.id) {
        const trackUris = (currentPlaylist.tracks?.map((track) => track?.uri).filter(Boolean) as string[]) ?? [];
        await addToPlaylist({ playlistId: spotifyPlaylist.id, trackUris: trackUris });
        await showToast({
          style: Toast.Style.Success,
          title: "Added playlist to Spotify",
          message: `"${currentPlaylist.name}" has been added to your Spotify Library`,
          primaryAction: {
            title: `Play "${currentPlaylist.name}"`,
            onAction: async () => {
              await play({ id: spotifyPlaylist.id, type: "playlist", contextUri: spotifyPlaylist.uri });
            },
          },
        });
      }
    } catch (error) {
      await showFailureToast(error, { title: "Could not add playlist to Spotify" });
    }
  }

  async function playPlaylist() {
    if (!currentPlaylist) return;
    if (!currentPlaylist.tracks || currentPlaylist.tracks.length === 0) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Starting playlist" });

      // Get all valid track URIs
      const trackUris = currentPlaylist.tracks
        .filter((track: TrackObject): track is NonNullable<typeof track> => track != null && track.uri != null)
        .map((track: TrackObject) => track.uri as string);

      if (trackUris.length === 0) {
        throw new Error("No valid tracks found");
      }

      // Play all tracks at once using uris array (replaces current playback)
      // NOTE: Doesn't overrides the queue (there is no API to clear queue)
      // Thus, it is better to use play with uris array instead of addToQueue
      await play({ uris: trackUris });

      await showToast({
        style: Toast.Style.Success,
        title: "Playing playlist",
        message: `Now playing "${currentPlaylist.name}"`,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could not play playlist" });
    }
  }

  async function addSongsToQueue() {
    if (!currentPlaylist) return;
    if (!currentPlaylist.tracks || currentPlaylist.tracks.length === 0) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding songs to queue" });

      let startedPlayback = false;

      // Using Promise.all could improve performance here, but it would disrupt the order of songs in the queue.
      for (const track of currentPlaylist.tracks) {
        if (!track || !track.uri) continue;

        try {
          await addToQueue({ uri: track.uri });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();

          // If no active device/player, play the first track directly to initialize playback
          if (
            !startedPlayback &&
            (errorMessage.includes("no active device") ||
              errorMessage.includes("no device found") ||
              errorMessage.includes("player command failed"))
          ) {
            await play({ id: track.id, type: "track" });
            startedPlayback = true;
            // Wait for playback to initialize before adding more tracks to queue
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            throw err;
          }
        }
      }

      await showToast({
        style: Toast.Style.Success,
        title: startedPlayback ? "Started playing and added songs to queue" : "Added songs to queue",
        primaryAction: !startedPlayback
          ? {
              title: "Play Next Song in Queue",
              onAction: async () => {
                await skipToNext();
                await play();
              },
            }
          : undefined,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could not add songs to queue" });
    }
  }

  return (
    <View>
      <List
        isLoading={isLoading}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder={
          history.length === 0 ? "Search songs or enter a prompt to generate" : "Search songs or enter a prompt to tune"
        }
      >
        {/* Generation error state */}
        {generationError && !isLoading && (
          <List.Section title="Error">
            <List.Item
              icon={Icon.ExclamationMark}
              title="Generation Error"
              subtitle={generationError.message}
              accessories={[{ tag: { value: "Failed", color: "#FF6B6B" } }]}
            />
            <List.Item
              icon={Icon.RotateClockwise}
              title={searchText ? `Retry: "${searchText}"` : "Retry"}
              subtitle={searchText ? "Press Enter to retry" : "Press Enter to retry"}
              actions={
                <ActionPanel>
                  <Action
                    title="Retry"
                    icon={Icon.RotateClockwise}
                    onAction={() => {
                      setGenerationError(null);
                      revalidate();
                    }}
                  />
                </ActionPanel>
              }
            />
            {currentPlaylist && (
              <List.Item
                icon={Icon.ArrowCounterClockwise}
                title="Keep Previous Version"
                subtitle={`Stay with "${currentPlaylist?.name}"`}
                actions={
                  <ActionPanel>
                    <Action
                      title="Keep Previous"
                      icon={Icon.ArrowCounterClockwise}
                      onAction={() => setGenerationError(null)}
                    />
                  </ActionPanel>
                }
              />
            )}
          </List.Section>
        )}

        {/* Normal playlist UI - only show when no error */}
        {currentPlaylist && !generationError && (
          <List.Section title="Actions">
            {/* Render Tune in first position when typing, otherwise render Play first */}
            {searchText.trim() ? (
              <>
                <List.Item
                  icon={Icon.Wand}
                  title={`Tune: "${searchText}"`}
                  subtitle="Press Enter to apply"
                  actions={
                    <ActionPanel>
                      <Action title="Tune with Prompt" icon={Icon.Wand} onAction={() => tunePlaylist(searchText)} />
                    </ActionPanel>
                  }
                />
                <List.Item
                  icon={Icon.Play}
                  title="Play Playlist"
                  actions={
                    <ActionPanel>
                      <Action title="Play Playlist" onAction={playPlaylist} />
                    </ActionPanel>
                  }
                />
              </>
            ) : (
              <>
                <List.Item
                  icon={Icon.Play}
                  title="Play Playlist"
                  actions={
                    <ActionPanel>
                      <Action title="Play Playlist" onAction={playPlaylist} />
                    </ActionPanel>
                  }
                />
                <List.Item
                  icon={Icon.Wand}
                  title="Tune Playlist"
                  subtitle="Type a prompt above"
                  actions={
                    <ActionPanel>
                      <Action title="Tune with Prompt" icon={Icon.Wand} onAction={() => tunePlaylist(searchText)} />
                    </ActionPanel>
                  }
                />
              </>
            )}

            <List.Item
              icon={Icon.Stars}
              title="Add Playlist to Spotify"
              actions={
                <ActionPanel>
                  <Action title="Add to Spotify" onAction={addPlaylistToSpotify} />
                </ActionPanel>
              }
            />

            <List.Item
              icon={Icon.BulletPoints}
              title="Add Songs to Queue"
              actions={
                <ActionPanel>
                  <Action title="Add Songs" onAction={addSongsToQueue} />
                </ActionPanel>
              }
            />

            {currentIndex > 0 && (
              <List.Item
                icon={Icon.ArrowCounterClockwise}
                title="Revert to Previous Version"
                subtitle={`"${history[currentIndex - 1]?.prompt}"`}
                actions={
                  <ActionPanel>
                    <Action title="Revert" icon={Icon.ArrowCounterClockwise} onAction={revertToPrevious} />
                  </ActionPanel>
                }
              />
            )}

            {currentIndex < history.length - 1 && (
              <List.Item
                icon={Icon.ArrowClockwise}
                title="Redo Next Version"
                subtitle={`"${history[currentIndex + 1]?.prompt}"`}
                actions={
                  <ActionPanel>
                    <Action title="Redo" icon={Icon.ArrowClockwise} onAction={redoNext} />
                  </ActionPanel>
                }
              />
            )}

            {history.length > 1 && (
              <List.Item
                icon={Icon.Clock}
                title="View Tune History"
                subtitle={`${history.length} versions`}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View History"
                      icon={Icon.Clock}
                      target={
                        <TuneHistoryList history={history} currentPlaylist={currentPlaylist} onSelect={jumpToVersion} />
                      }
                    />
                  </ActionPanel>
                }
              />
            )}
          </List.Section>
        )}

        {/* Track list - show even during generation error if we have tracks */}
        {currentPlaylist?.tracks && (
          <List.Section title={generationError ? `Previous: ${currentPlaylist?.name}` : currentPlaylist?.name}>
            {currentPlaylist.tracks.map((track) => {
              if (!track) return null;
              return <TrackListItem key={`${track.id}`} track={track} album={track.album} showGoToAlbum />;
            })}
          </List.Section>
        )}

        {/* See previous generations */}
        {(!props.arguments.description || props.arguments.description.trim() === "") && (
          <List.Section title="Generation History">
            {Object.entries(historyArchiveById).map(([id, history]) => (
              <List.Item
                key={id}
                title={id}
                subtitle={`${history.length} versions`}
                actions={
                  <ActionPanel title={id}>
                    <Action
                      title="View Generation"
                      icon={Icon.Clock}
                      onAction={() => {
                        // Set current playlist to the last tune
                        setCurrentPlaylist(history[history.length - 1]);
                        setHistory(history);
                      }}
                    />
                    <Action
                      title="Delete Generation"
                      icon={Icon.Trash}
                      onAction={() => {
                        setHistoryArchiveById((prev) => {
                          const newState = { ...prev };
                          delete newState[id];
                          return newState;
                        });
                      }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}
      </List>
    </View>
  );
}
