import { deleteMeTracks } from "../helpers/spotify.api";

type RemoveFromMySavedTracksParams = {
  trackIds: string[];
};

export async function removeFromMySavedTracks(params: RemoveFromMySavedTracksParams): Promise<void> {
  await deleteMeTracks(params.trackIds.join(","), { ids: params.trackIds });
}
