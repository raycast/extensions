import { AI, Action, ActionPanel, Icon, LaunchProps, List, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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
  isInitialGeneration: boolean;
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

  return errorString;
}

async function resolveTracksOnSpotify(
  aiTracks: { title: string; artist: string }[],
): Promise<(SimplifiedTrackObject | null)[]> {
  return await Promise.all(
    aiTracks.map(async (song) => {
      try {
        const response = await searchTracks(`track:${song.title} artist:${song.artist}`, 1);
        const track = response?.items?.[0];
        if (track) {
          return track;
        }
      } catch (error) {
        console.error(error);
      }
      return null;
    }),
  );
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

  try {
    return JSON.parse(jsonString) as AiPlaylist;
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
      return JSON.parse(jsonString) as AiPlaylist;
    } catch (secondError) {
      // Log the problematic JSON for debugging
      console.error("Failed to parse AI response:", jsonString.substring(0, 500));
      throw new Error(
        `Failed to parse AI response: ${secondError instanceof Error ? secondError.message : "Invalid JSON"}`,
      );
    }
  }
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<ErrorState | null>(null);

  const currentPlaylist = history[currentIndex];
  const canRevert = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  // Initial playlist generation
  useEffect(() => {
    generateInitialPlaylist();
  }, []);

  async function generateInitialPlaylist() {
    const prompt = props.arguments.description;
    try {
      setIsLoading(true);
      setError(null);

      const data = await AI.ask(
        `Generate a playlist of at least 20 songs and no more than 75 songs based strictly on the description "${prompt}", using ONLY the listed artists if any are explicitly mentioned, but if no artists are listed then infer culturally relevant songs, themes, and sub genres with high specificity, selecting deep and intentional tracks that fit the exact vibe, enforcing smooth energy progression and subgenre consistency, avoiding generic picks, and returning only a fully minified valid JSON object with the following structure:

{
  "name": <Playlist name>,
  "description": <Playlist description>,
  "tracks": [
    {
      "title": <Song title>,
      "artist": <Song's artist>
    },
    ...
  ]
}

If you have listed fewer than 20 songs you must keep adding valid songs until the playlist length is at least 20.

`,
        { model: AI.Model["OpenAI_GPT5-mini"] },
      );

      const aiPlaylist = parseAiPlaylistResponse(data);
      const spotifyTracks = await resolveTracksOnSpotify(aiPlaylist.tracks);

      setHistory([
        {
          name: aiPlaylist.name,
          description: aiPlaylist.description,
          tracks: spotifyTracks,
          prompt: prompt,
        },
      ]);
      setCurrentIndex(0);
      setError(null);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError({
        message: errorMessage,
        failedPrompt: prompt,
        isInitialGeneration: true,
      });
      setSearchText(prompt);
      await showFailureToast(errorMessage, { title: "Could not generate playlist" });
    } finally {
      setIsLoading(false);
    }
  }

  async function tunePlaylist(prompt: string) {
    if (!prompt.trim()) return;

    // If we're in error state from initial generation, retry initial generation
    if (error?.isInitialGeneration) {
      await retryWithPrompt(prompt);
      return;
    }

    if (!currentPlaylist) return;

    try {
      setIsLoading(true);
      setError(null);

      const currentTracksContext = currentPlaylist.tracks
        .filter(Boolean)
        .map((t) => `- "${t!.name}" by ${t!.artists?.map((a) => a.name).join(", ")}`)
        .join("\n");

      const aiPrompt = `You are tuning an existing playlist. Here are the current songs:

${currentTracksContext}

The user wants to modify this playlist with the following instruction: "${prompt}"

Generate an updated playlist of 20-75 songs that follows this instruction. You may:
- Keep songs that fit the new criteria
- Remove songs that don't fit
- Add new songs that match the user's request

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation. Use this exact structure:
{"name": "Playlist Name", "description": "Playlist description", "tracks": [{"title": "Song Title", "artist": "Artist Name"}]}

Ensure all strings are properly escaped and there are no trailing commas.`;

      await showToast({ style: Toast.Style.Animated, title: "Tuning playlist with AI..." });

      const data = await AI.ask(aiPrompt, { model: AI.Model["OpenAI_GPT5-mini"] });
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
      setError(null);

      await showToast({
        style: Toast.Style.Success,
        title: "Playlist tuned",
        message: `"${aiPlaylist.name}" - ${spotifyTracks.filter(Boolean).length} songs`,
      });
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError({
        message: errorMessage,
        failedPrompt: prompt,
        isInitialGeneration: false,
      });
      setSearchText(prompt);
      await showFailureToast(errorMessage, { title: "Could not tune playlist" });
    } finally {
      setIsLoading(false);
    }
  }

  async function retryWithPrompt(prompt: string) {
    try {
      setIsLoading(true);
      setError(null);

      const data = await AI.ask(
        `Generate a playlist of at least 20 songs and no more than 75 songs based strictly on the description "${prompt}", using ONLY the listed artists if any are explicitly mentioned, but if no artists are listed then infer culturally relevant songs, themes, and sub genres with high specificity, selecting deep and intentional tracks that fit the exact vibe, enforcing smooth energy progression and subgenre consistency, avoiding generic picks, and returning only a fully minified valid JSON object with the following structure:

{
  "name": <Playlist name>,
  "description": <Playlist description>,
  "tracks": [
    {
      "title": <Song title>,
      "artist": <Song's artist>
    },
    ...
  ]
}

If you have listed fewer than 20 songs you must keep adding valid songs until the playlist length is at least 20.

`,
        { model: AI.Model["OpenAI_GPT5-mini"] },
      );

      const aiPlaylist = parseAiPlaylistResponse(data);
      const spotifyTracks = await resolveTracksOnSpotify(aiPlaylist.tracks);

      setHistory([
        {
          name: aiPlaylist.name,
          description: aiPlaylist.description,
          tracks: spotifyTracks,
          prompt: prompt,
        },
      ]);
      setCurrentIndex(0);
      setSearchText("");
      setError(null);

      await showToast({
        style: Toast.Style.Success,
        title: "Playlist generated",
        message: `"${aiPlaylist.name}" - ${spotifyTracks.filter(Boolean).length} songs`,
      });
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError({
        message: errorMessage,
        failedPrompt: prompt,
        isInitialGeneration: true,
      });
      setSearchText(prompt);
      await showFailureToast(errorMessage, { title: "Could not generate playlist" });
    } finally {
      setIsLoading(false);
    }
  }

  function revertToPrevious() {
    if (canRevert) {
      setCurrentIndex((prev) => prev - 1);
      setError(null);
      showToast({ style: Toast.Style.Success, title: "Reverted to previous version" });
    }
  }

  function redoNext() {
    if (canRedo) {
      setCurrentIndex((prev) => prev + 1);
      setError(null);
      showToast({ style: Toast.Style.Success, title: "Restored next version" });
    }
  }

  function jumpToVersion(index: number) {
    if (index >= 0 && index < history.length) {
      setCurrentIndex(index);
      setError(null);
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

  // The AI might return duplicate songs, so we need to filter them out
  const tracks = [...new Set(currentPlaylist?.tracks)];
  const hasPlaylist = tracks && tracks.length > 0 && !error;

  // Determine placeholder text based on state
  const getPlaceholder = () => {
    if (isLoading) {
      return history.length === 0 ? "Generating playlist..." : "Tuning playlist...";
    }
    if (error) {
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
        {/* Error state UI */}
        {error && !isLoading && (
          <>
            <List.Item
              icon={Icon.ExclamationMark}
              title="Error"
              subtitle={error.message}
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
                      const promptToUse = searchText.trim() || error.failedPrompt;
                      if (error.isInitialGeneration) {
                        retryWithPrompt(promptToUse);
                      } else {
                        tunePlaylist(promptToUse);
                      }
                    }}
                  />
                </ActionPanel>
              }
            />

            {/* If we have previous history, allow reverting */}
            {history.length > 0 && !error.isInitialGeneration && (
              <List.Item
                icon={Icon.ArrowCounterClockwise}
                title="Keep Previous Version"
                subtitle={`Stay with "${currentPlaylist?.name}"`}
                actions={
                  <ActionPanel>
                    <Action title="Keep Previous" icon={Icon.ArrowCounterClockwise} onAction={() => setError(null)} />
                  </ActionPanel>
                }
              />
            )}
          </>
        )}

        {/* Normal playlist UI - only show when no error */}
        {hasPlaylist && (
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

        {/* Track list - show even during error if we have previous tracks */}
        {tracks && tracks.length > 0 && (
          <List.Section title={error ? `Previous: ${currentPlaylist?.name}` : currentPlaylist?.name}>
            {tracks.map((track) => {
              if (!track) return null;
              return <TrackListItem key={track.id} track={track} album={track.album} showGoToAlbum />;
            })}
          </List.Section>
        )}
      </List>
    </View>
  );
}
