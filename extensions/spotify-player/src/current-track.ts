import { updateCommandMetadata } from "@raycast/api";
import { EpisodeObject, TrackObject } from "./helpers/spotify.api";
import { getSpotifyClient, setSpotifyClient } from "./helpers/withSpotifyClient";
import { containsMySavedTracks } from "./api/containsMySavedTrack";

async function getIsLiked(id: string): Promise<boolean> {
  const res = await containsMySavedTracks({ trackIds: [id] });
  return res[0];
}

async function getItem() {
  await setSpotifyClient();

  const { spotifyClient } = getSpotifyClient();

  const response = await spotifyClient.getMePlayerCurrentlyPlaying({ additionalTypes: "episode" });

  if (response) {
    const item = response.item as unknown as EpisodeObject | TrackObject;
    return item;
  }
}

async function getStatusString() {
  const item = await getItem();
  if (!item) return "No active device";

  const id = item.id;
  if (!id) return "No active device";

  const isLiked = await getIsLiked(id);

  const name = item.name;

  let artistOrShow = "unknown";

  if (item.type === "episode") {
    artistOrShow = (item as EpisodeObject).show.name;
  } else {
    artistOrShow = (item as TrackObject).artists?.at(0)?.name ?? "unknown";
  }

  return `${name} - ${artistOrShow} ${isLiked ? "♥" : "♡"}`;
}

export default async function Command() {
  const status = await getStatusString();
  await updateCommandMetadata({ subtitle: status });
}
