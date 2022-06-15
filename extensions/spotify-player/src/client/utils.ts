import { getApplications } from "@raycast/api";

export async function isSpotifyInstalled() {
  const applications = await getApplications();

  return applications.some(({ bundleId }) => bundleId === "com.spotify.client");
}
