import { searchTracks } from "../api/searchTracks";
import { TrackObject } from "./spotify.api";

export async function resolveTracksOnSpotify(aiTracks: TrackObject[]): Promise<TrackObject[]> {
  const tracks = await Promise.all(
    aiTracks.map(async (song) => {
      try {
        console.log(`TRACK OBJECT: ${JSON.stringify(song)}`);
        const response = await searchTracks(
          `track:${song.name} artist:${Array.isArray(song.artists) ? song.artists.map((a) => a.name || a).join(" ") : song.artists}`,
          1,
        );
        const track = response?.items?.[0];
        if (track) {
          console.log(`Found on Spotify: "${track.name}" by ${track.artists?.map((a) => a.name).join(", ")}`);
          return track;
        }
      } catch (error) {
        console.error(error);
      }
      console.log(`Didn't find "${song.name}" by ${song.artists} on Spotify`);
      return null;
    }),
  );

  const validTracks = tracks.filter((t) => t !== null);
  if (validTracks.length === 0) {
    throw new Error("None of the suggested songs could be found on Spotify. Please try a different prompt.");
  }

  return validTracks;
}
