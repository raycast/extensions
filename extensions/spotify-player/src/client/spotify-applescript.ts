import { exec } from "child_process";
import { promisify } from "util";

const execp = promisify(exec);

export async function playSong(uri: string): Promise<void> {
  await execp(`
    osascript -e 'tell application "Spotify" to play track "${uri}"'
  `);
}
