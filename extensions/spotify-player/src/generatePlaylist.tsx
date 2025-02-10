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
        `Generate a playlist of 20 to 50 songs based on this description: "${props.arguments.description}". IMPORTANT: If the description contains a list of artist names (e.g., "songs from artist1, artist2, artist3, artist4, artist5"), ONLY include songs from those specific artists. Do not include any songs from artists not mentioned in the description. Ensure the songs transition smoothly between each other. Return me only a parsable and minified JSON object with the following structure:
            

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
}`,
        { model: AI.Model["OpenAI_GPT4o-mini"] },
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
        description: playlist?.description,
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

  async function addSongsToQueue() {
    if (!playlist) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding songs to queue" });
      // Using Promise.all could improve performance here, but it would disrupt the order of songs in the queue.
      for (const track of tracks ?? []) {
        if (!track || !track.uri) continue;
        await addToQueue({ uri: track?.uri });
      }
      await showToast({
        style: Toast.Style.Success,
        title: "Added songs to queue",
        primaryAction: {
          title: "Play Next Song in Queue",
          onAction: async () => {
            await skipToNext();
            await play();
          },
        },
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
