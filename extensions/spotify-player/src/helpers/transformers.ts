import { TrackObject } from "./spotify.api";
import { MinimalTrack } from "../api/getMySavedTracks";

export const transformTrackToMinimal = (track: TrackObject): MinimalTrack => ({
  id: track.id ?? "",
  name: track.name ?? "",
  artists: track.artists?.map((artist) => ({ name: artist.name ?? "" })) ?? [],
  album: {
    id: track.album?.id ?? "",
    name: track.album?.name ?? "",
    images: track.album?.images?.map((image) => ({ url: image.url ?? "" })) ?? [],
  },
  uri: track.uri ?? "",
  duration_ms: track.duration_ms ?? 0,
});
