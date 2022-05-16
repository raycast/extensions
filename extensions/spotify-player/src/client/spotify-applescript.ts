import { exec } from "child_process";
import { promisify } from "util";

const execp = promisify(exec);

export async function playSong(uri: string): Promise<void> {
  await execp(`
    osascript -e 'tell application "Spotify" to play track "${uri}"'
  `);
}

export async function checkIfSpotifyExists(): Promise<boolean> {
  const appName = await execp(
    `osascript -e 'tell application "Finder" to get displayed name of application file id "com.spotify.client"'`
  );

  if (appName) {
    return true;
  }

  return false;
}
