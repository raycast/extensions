import fetch from "node-fetch";

export async function addToSavedTracks(trackId: string, accessToken: string) {
  return fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function removeFromSavedTracks(trackId: string, accessToken: string) {
  return fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
