import { AI, Action, ActionPanel, Icon, LaunchProps, List, Toast, showToast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { searchTracks } from "./api/searchTracks";
import { View } from "./components/View";
import TrackListItem from "./components/TrackListItem";
import { createPlaylist } from "./api/createPlaylist";
import { addToPlaylist } from "./api/addToPlaylist";
import { play } from "./api/play";
import { addToQueue } from "./api/addTrackToQueue";
import { skipToNext } from "./api/skipToNext";

type Playlist = {
  name: string;
  description: string;
  tracks: { title: string; artist: string }[];
};

export default function Command(props: LaunchProps<{ arguments: Arguments.GeneratePlaylist }>) {
  const { data: playlist, isLoading } = usePromise(
    async () => {
      const data = await AI.ask(
        `Generate a playlist of at least 20 songs and no more than 75 songs based strictly on the description "${props.arguments.description}", using ONLY the listed artists if any are explicitly mentioned, but if no artists are listed then infer culturally relevant songs, themes, and sub genres with high specificity, selecting deep and intentional tracks that fit the exact vibe, enforcing smooth energy progression and subgenre consistency, avoiding generic picks, and returning only a fully minified valid JSON object with the following structure:

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
      const match = data.match(/[{\\[]{1}([,:{}\\[\]0-9.\-+Eaeflnr-u \n\r\t]|".*?")+[}\]]{1}/gis)?.[0];
      if (!match) {
        throw new Error("Invalid result returned from AI");
      }
      const playlist = JSON.parse(match) as Playlist;

      const spotifyTracks = await Promise.all(
        playlist.tracks.map(async (song) => {
          try {
            const response = await searchTracks(`track:${song.title} artist:${song.artist}`, 1);
            const track = response?.items?.[0];

            if (track) {
              return track;
            }
          } catch (error) {
            console.error(error);
            return null;
          }
        }),
      );

      return { name: playlist.name, description: playlist.description, tracks: spotifyTracks };
    },
    [],
    { failureToastOptions: { title: "Could not generate playlist", message: "Please try again." } },
  );

  async function addPlaylistToSpotify() {
    if (!playlist) return;
    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding playlist to Spotify" });
      const spotifyPlaylist = await createPlaylist({
        name: playlist.name,
        description: playlist.description,
      });
      if (spotifyPlaylist?.id) {
        const trackUris = (tracks?.map((track) => track?.uri).filter(Boolean) as string[]) ?? [];
        await addToPlaylist({ playlistId: spotifyPlaylist.id, trackUris: trackUris });
        await showToast({
          style: Toast.Style.Success,
          title: "Added playlist to Spotify",
          message: `"${playlist.name}" has been added to your Spotify Library`,
          primaryAction: {
            title: `Play "${playlist.name}"`,
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
    if (!playlist) return;
    if (!tracks || tracks.length === 0) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Starting playlist" });

      // Find the first valid track to play
      const firstTrack = tracks.find((track) => track && track.id);
      if (!firstTrack) {
        throw new Error("No valid tracks found");
      }

      // Play the first track
      await play({ id: firstTrack.id, type: "track" });

      // Wait for playback to initialize before adding remaining tracks to queue
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Add remaining tracks to queue
      for (let i = 1; i < tracks.length; i++) {
        const track = tracks[i];
        if (!track || !track.uri) continue;
        await addToQueue({ uri: track.uri });
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Playing playlist",
        message: `Now playing "${playlist.name}"`,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could not play playlist" });
    }
  }

  async function addSongsToQueue() {
    if (!playlist) return;
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

  // The AI might return duplicate songs, so we need to filter them out
  const tracks = [...new Set(playlist?.tracks)];

  return (
    <View>
      <List
        isLoading={isLoading}
        searchBarPlaceholder={tracks && tracks.length > 0 ? "Search songs" : "Generating playlist…"}
      >
        {tracks && tracks.length > 0 ? (
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
          </>
        ) : null}

        <List.Section title={playlist?.name}>
          {tracks?.map((track) => {
            if (!track) return null;
            return <TrackListItem key={track.id} track={track} album={track.album} showGoToAlbum />;
          })}
        </List.Section>
      </List>
    </View>
  );
}
