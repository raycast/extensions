import { getApplications } from "@raycast/api";

export let isSpotifyInstalled = false;

export async function checkSpotifyApp() {
  const applications = await getApplications();
  const spotifyApp = applications.find((app) =>
    app.bundleId ? app.bundleId === "com.spotify.client" : app.name === "Spotify",
  );
  isSpotifyInstalled = Boolean(spotifyApp);
  return isSpotifyInstalled;
}
