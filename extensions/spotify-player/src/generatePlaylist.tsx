import { AI, Action, ActionPanel, Icon, LaunchProps, List, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import retry from "async-retry";
import { useEffect, useState } from "react";
import { searchTracks } from "./api/searchTracks";
import { View } from "./components/View";
import TrackListItem from "./components/TrackListItem";
import { createPlaylist } from "./api/createPlaylist";
import { addToPlaylist } from "./api/addToPlaylist";
import { play } from "./api/play";
import { addToQueue } from "./api/addTrackToQueue";
import { skipToNext } from "./api/skipToNext";
import { SimplifiedTrackObject } from "./helpers/spotify.api";

type AiPlaylist = {
  name: string;
  description: string;
  tracks: { title: string; artist: string }[];
};

type PlaylistVersion = {
  name: string;
  description: string;
  tracks: (SimplifiedTrackObject | null | undefined)[];
  prompt: string;
};

type ErrorState = {
  message: string;
  failedPrompt: string;
};

function getErrorMessage(error: unknown): string {
  const errorString = error instanceof Error ? error.message : String(error);

  // Check for common service errors
  if (errorString.includes("503") || errorString.includes("heroku") || errorString.includes("Service Unavailable")) {
    return "AI service is temporarily unavailable. Please try again in a few moments.";
  }

  if (errorString.includes("Failed to parse AI response") || errorString.includes("No JSON object found")) {
    return "AI returned an invalid response. Please try again.";
  }

  if (errorString.includes("rate limit") || errorString.includes("429")) {
    return "Too many requests. Please wait a moment and try again.";
  }

  if (errorString.includes("contains no songs") || errorString.includes("could be found on Spotify")) {
    return "AI didn't return any valid songs. Please try a different prompt.";
  }

  return errorString;
}

async function resolveTracksOnSpotify(
  aiTracks: { title: string; artist: string }[],
): Promise<(SimplifiedTrackObject | null)[]> {
  const tracks = await Promise.all(
    aiTracks.map(async (song) => {
      try {
        // First try strict search with track: and artist: filters
        let response = await searchTracks(`track:${song.title} artist:${song.artist}`, 1);
        let track = response?.items?.[0];
        if (track) {
          return track;
        }

        // Fallback: try a more lenient search without filters
        // This helps when AI gives slightly wrong song/artist names
        response = await searchTracks(`${song.title} ${song.artist}`, 1);
        track = response?.items?.[0];
        if (track) {
          return track;
        }
      } catch (error) {
        console.error(error);
      }
      return null;
    }),
  );

  // Check if any tracks were found on Spotify
  const validTracks = tracks.filter((t) => t !== null);
  if (validTracks.length === 0) {
    throw new Error("None of the suggested songs could be found on Spotify. Please try a different prompt.");
  }

  return tracks;
}

function parseAiPlaylistResponse(data: string): AiPlaylist {
  // Try to find JSON object in the response
  // First, try to find a JSON block (possibly wrapped in markdown code blocks)
  let jsonString = data;

  // Remove markdown code blocks if present
  const codeBlockMatch = data.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonString = codeBlockMatch[1].trim();
  }

  // Try to extract JSON object starting with { and ending with }
  const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in AI response");
  }

  jsonString = jsonMatch[0];

  // Clean up common issues in AI-generated JSON
  // Fix trailing commas before } or ]
  jsonString = jsonString.replace(/,\s*([}\]])/g, "$1");

  // Fix unescaped quotes within strings (try to be conservative)
  // This is tricky - we'll attempt to parse and if it fails, try more aggressive fixes

  let playlist: AiPlaylist;

  try {
    playlist = JSON.parse(jsonString) as AiPlaylist;
  } catch (firstError) {
    // Try additional cleanup for common AI mistakes

    // Sometimes AI adds comments or extra text after JSON
    let braceCount = 0;
    let endIndex = jsonString.length;

    for (let i = 0; i < jsonString.length; i++) {
      if (jsonString[i] === "{") braceCount++;
      if (jsonString[i] === "}") {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }

    jsonString = jsonString.substring(0, endIndex);

    try {
      playlist = JSON.parse(jsonString) as AiPlaylist;
    } catch (secondError) {
      // Log the problematic JSON for debugging
      console.error("Failed to parse AI response:", jsonString.substring(0, 500));
      throw new Error(
        `Failed to parse AI response: ${secondError instanceof Error ? secondError.message : "Invalid JSON"}`,
      );
    }
  }

  // Validate that the playlist has tracks
  if (!playlist.tracks || !Array.isArray(playlist.tracks) || playlist.tracks.length === 0) {
    throw new Error("AI response contains no songs. Please try again with a different prompt.");
  }

  return playlist;
}

async function generatePlaylistFromPrompt(prompt: string): Promise<PlaylistVersion> {
  const data = await AI.ask(
    `Generate a playlist of 10-25 songs based on "${prompt}". Use ONLY listed artists if mentioned, otherwise infer culturally relevant songs with high specificity. Return ONLY minified JSON:

{"name": "<Playlist name>", "description": "<Description>", "tracks": [{"title": "<Exact Spotify song title>", "artist": "<Primary artist>"}]}

Use exact Spotify song/artist names. No markdown, no explanation.`,
    { model: AI.Model["OpenAI_GPT-5_mini"] },
  );

  const aiPlaylist = parseAiPlaylistResponse(data);
  const spotifyTracks = await resolveTracksOnSpotify(aiPlaylist.tracks);

  return {
    name: aiPlaylist.name,
    description: aiPlaylist.description,
    tracks: spotifyTracks,
    prompt: prompt,
  };
}

function TuneHistoryList({
  history,
  currentIndex,
  onSelect,
}: {
  history: PlaylistVersion[];
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  const { pop } = useNavigation();

  return (
    <List navigationTitle="Tune History">
      {history.map((version, index) => (
        <List.Item
          key={index}
          icon={index === currentIndex ? Icon.CheckCircle : Icon.Circle}
          title={version.name}
          subtitle={version.prompt}
          accessories={[
            { text: `${version.tracks.filter(Boolean).length} songs` },
            ...(index === currentIndex ? [{ tag: "Current" }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Jump to Version"
                onAction={() => {
                  onSelect(index);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments.GeneratePlaylist }>) {
  const [history, setHistory] = useState<PlaylistVersion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [tuneError, setTuneError] = useState<ErrorState | null>(null);
  const [isTuning, setIsTuning] = useState(false);
  const [historyInitialized, setHistoryInitialized] = useState(false);

  // Use usePromise for initial playlist generation (handles React Strict Mode correctly)
  // Empty dependency array ensures this only runs once on mount
  const {
    data: initialPlaylist,
    isLoading: isInitialLoading,
    error: initialError,
    revalidate,
  } = usePromise(
    async () => {
      const prompt = props.arguments.description;
      return await generatePlaylistFromPrompt(prompt);
    },
    [],
    {
      onError: (err) => {
        showFailureToast(getErrorMessage(err), { title: "Could not generate playlist" });
      },
    },
  );

  // Initialize history when initialPlaylist becomes available (only once)
  useEffect(() => {
    if (initialPlaylist && !historyInitialized) {
      setHistory([initialPlaylist]);
      setCurrentIndex(0);
      setHistoryInitialized(true);
    }
  }, [initialPlaylist, historyInitialized]);

  const currentPlaylist = history[currentIndex];
  const canRevert = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;
  const isLoading = isInitialLoading || isTuning;

  async function tunePlaylist(prompt: string) {
    if (!prompt.trim()) return;
    if (!currentPlaylist) return;

    try {
      setIsTuning(true);
      setTuneError(null);

      const currentTracksContext = currentPlaylist.tracks
        .filter(Boolean)
        .map((t) => `"${t!.name}" - ${t!.artists?.map((a) => a.name).join(", ")}`)
        .join(", ");

      const aiPrompt = `Current playlist: [${currentTracksContext}]

Modify with: "${prompt}"

Return 10-25 songs as minified JSON only:
{"name": "<Name>", "description": "<Desc>", "tracks": [{"title": "<Exact Spotify title>", "artist": "<Primary artist>"}]}`;

      await showToast({ style: Toast.Style.Animated, title: "Tuning playlist with AI..." });

      const data = await AI.ask(aiPrompt, { model: AI.Model["OpenAI_GPT4o-mini"] });
      const aiPlaylist = parseAiPlaylistResponse(data);
      const spotifyTracks = await resolveTracksOnSpotify(aiPlaylist.tracks);

      const newVersion: PlaylistVersion = {
        name: aiPlaylist.name,
        description: aiPlaylist.description,
        tracks: spotifyTracks,
        prompt: prompt,
      };

      // Truncate future history if we've reverted, then add new version
      setHistory((prev) => [...prev.slice(0, currentIndex + 1), newVersion]);
      setCurrentIndex((prev) => prev + 1);
      setSearchText("");
      setTuneError(null);

      await showToast({
        style: Toast.Style.Success,
        title: "Playlist tuned",
        message: `"${aiPlaylist.name}" - ${spotifyTracks.filter(Boolean).length} songs`,
      });
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setTuneError({
        message: errorMessage,
        failedPrompt: prompt,
      });
      setSearchText(prompt);
      await showFailureToast(errorMessage, { title: "Could not tune playlist" });
    } finally {
      setIsTuning(false);
    }
  }

  function revertToPrevious() {
    if (canRevert) {
      setCurrentIndex((prev) => prev - 1);
      setTuneError(null);
      showToast({ style: Toast.Style.Success, title: "Reverted to previous version" });
    }
  }

  function redoNext() {
    if (canRedo) {
      setCurrentIndex((prev) => prev + 1);
      setTuneError(null);
      showToast({ style: Toast.Style.Success, title: "Restored next version" });
    }
  }

  function jumpToVersion(index: number) {
    if (index >= 0 && index < history.length) {
      setCurrentIndex(index);
      setTuneError(null);
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
        const trackUris = (tracks?.map((track) => track?.uri).filter(Boolean) as string[]) ?? [];
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
    if (!tracks || tracks.length === 0) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Starting playlist" });

      // Get all valid track URIs
      const trackUris = tracks
        .filter((track): track is NonNullable<typeof track> => track != null && track.uri != null)
        .map((track) => track.uri as string);

      if (trackUris.length === 0) {
        throw new Error("No valid tracks found");
      }

      // Play all tracks at once using uris array (replaces current playback/queue)
      await retry(
        async () => {
          await play({ uris: trackUris });
        },
        // Retry logic to handle cases where Spotify is not open yet.
        { retries: 3, minTimeout: 1000 },
      );

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
    if (!tracks || tracks.length === 0) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding songs to queue" });

      let startedPlayback = false;

      // Using Promise.all could improve performance here, but it would disrupt the order of songs in the queue.
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
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
            // Use retry as Spotify may take time to open
            await retry(
              async () => {
                await play({ id: track.id, type: "track" });
              },
              { retries: 3, minTimeout: 1000 },
            );
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

  // The AI might return duplicate songs, so we need to filter them out by track ID
  const tracks =
    currentPlaylist?.tracks?.filter(
      (track, index, arr) => track && arr.findIndex((t) => t?.id === track.id) === index,
    ) ?? [];
  const hasPlaylist = tracks && tracks.length > 0;
  const hasError = initialError || tuneError;

  // Determine placeholder text based on state
  const getPlaceholder = () => {
    if (isLoading) {
      return history.length === 0 ? "Generating playlist..." : "Tuning playlist...";
    }
    if (hasError) {
      return "Edit prompt and press Enter to retry";
    }
    return "Search songs or enter a prompt to tune";
  };

  return (
    <View>
      <List
        isLoading={isLoading}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder={getPlaceholder()}
      >
        {/* Initial generation error state */}
        {initialError && !isLoading && (
          <>
            <List.Item
              icon={Icon.ExclamationMark}
              title="Error"
              subtitle={getErrorMessage(initialError)}
              accessories={[{ tag: { value: "Failed", color: "#FF6B6B" } }]}
            />
            <List.Item
              icon={Icon.RotateClockwise}
              title="Retry"
              subtitle="Press Enter to retry generating the playlist"
              actions={
                <ActionPanel>
                  <Action title="Retry" icon={Icon.RotateClockwise} onAction={() => revalidate()} />
                </ActionPanel>
              }
            />
          </>
        )}

        {/* Tuning error state */}
        {tuneError && !isLoading && (
          <>
            <List.Item
              icon={Icon.ExclamationMark}
              title="Tuning Error"
              subtitle={tuneError.message}
              accessories={[{ tag: { value: "Failed", color: "#FF6B6B" } }]}
            />
            <List.Item
              icon={Icon.RotateClockwise}
              title={searchText ? `Retry: "${searchText}"` : "Retry"}
              subtitle={searchText ? "Press Enter to retry" : "Edit the prompt above and press Enter"}
              actions={
                <ActionPanel>
                  <Action
                    title="Retry"
                    icon={Icon.RotateClockwise}
                    onAction={() => {
                      const promptToUse = searchText.trim() || tuneError.failedPrompt;
                      tunePlaylist(promptToUse);
                    }}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              icon={Icon.ArrowCounterClockwise}
              title="Keep Previous Version"
              subtitle={`Stay with "${currentPlaylist?.name}"`}
              actions={
                <ActionPanel>
                  <Action title="Keep Previous" icon={Icon.ArrowCounterClockwise} onAction={() => setTuneError(null)} />
                </ActionPanel>
              }
            />
          </>
        )}

        {/* Normal playlist UI - only show when no error */}
        {hasPlaylist && !hasError && (
          <>
            <List.Item
              icon={Icon.Wand}
              title={searchText ? `Tune: "${searchText}"` : "Tune Playlist"}
              subtitle={searchText ? "Press Enter to apply" : "Type a prompt above"}
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

            {canRevert && (
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

            {canRedo && (
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
                        <TuneHistoryList history={history} currentIndex={currentIndex} onSelect={jumpToVersion} />
                      }
                    />
                  </ActionPanel>
                }
              />
            )}
          </>
        )}

        {/* Track list - show even during tuning error if we have tracks */}
        {tracks && tracks.length > 0 && (
          <List.Section title={tuneError ? `Previous: ${currentPlaylist?.name}` : currentPlaylist?.name}>
            {tracks.map((track, index) => {
              if (!track) return null;
              return <TrackListItem key={`${track.id}-${index}`} track={track} album={track.album} showGoToAlbum />;
            })}
          </List.Section>
        )}
      </List>
    </View>
  );
}
