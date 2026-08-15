import { exec } from "child_process";
import { showToast, Toast } from "@raycast/api";

async function getKaraokeState(): Promise<boolean> {
  return new Promise((resolve) => {
    exec("defaults read com.aviwadhwa.SpotifyLyricsInMenubar karaoke", (error, stdout) => {
      if (error) {
        // If the key doesn't exist, assume it's false
        resolve(false);
      } else {
        resolve(stdout.trim() === "1");
      }
    });
  });
}

export default async () => {
  try {
    const currentState = await getKaraokeState();
    const newState = !currentState;
    const command = `defaults write com.aviwadhwa.SpotifyLyricsInMenubar karaoke -bool ${newState}`;

    await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to toggle Karaoke Mode",
            message: stderr || error.message,
          });
          reject(stderr || error.message);
        } else {
          showToast({
            style: Toast.Style.Success,
            title: `Karaoke Mode ${newState ? "enabled" : "disabled"}`,
          });
          resolve(stdout);
        }
      });
    });
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error toggling Karaoke Mode",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
