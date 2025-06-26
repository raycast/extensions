import { showHUD, closeMainWindow, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import { Station } from "../types/station";
import { addToRecentlyPlayed } from "./storage";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

async function checkPlayerInstalled(player: string): Promise<boolean> {
  try {
    await execAsync(`which ${player}`);
    return true;
  } catch {
    return false;
  }
}

async function getDirectStreamUrl(plsUrl: string): Promise<string | null> {
  try {
    const response = await fetch(plsUrl);
    const plsContent = await response.text();

    // Parse PLS file to find first stream URL
    const match = plsContent.match(/File1=(.*)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch (error) {
    console.error("Failed to parse PLS file:", error);
  }
  return null;
}

async function launchPlayer(
  command: string,
  args: string[],
  station: Station,
  playerName: string,
  toast: Toast,
): Promise<void> {
  await execFileAsync(command, args);
  await addToRecentlyPlayed(station.id);
  toast.style = Toast.Style.Success;
  toast.title = `Playing ${station.title}`;
  toast.message = playerName ? `Opened in ${playerName}` : `Opened ${station.title}`;
  await closeMainWindow();
}

export async function playStation(station: Station): Promise<void> {
  // Find MP3 stream URL
  const mp3Stream = station.playlists.find((playlist) => playlist.format.toLowerCase() === "mp3");

  if (!mp3Stream) {
    await showHUD(`No MP3 stream available for ${station.title}`);
    return;
  }

  // Show loading toast
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Opening ${station.title}...`,
  });

  try {
    // Try different playback methods

    // Method 1: Try IINA (popular macOS media player)
    if (await checkPlayerInstalled("iina")) {
      await launchPlayer("iina", [mp3Stream.url], station, "IINA", toast);
      return;
    }

    // Method 2: Try VLC
    if (await checkPlayerInstalled("vlc")) {
      await launchPlayer("vlc", [mp3Stream.url, "--intf", "dummy", "--play-and-exit"], station, "VLC", toast);
      return;
    }

    // Method 3: Try to get direct stream URL and use Music.app
    const directUrl = await getDirectStreamUrl(mp3Stream.url);
    if (directUrl) {
      await launchPlayer("open", ["-a", "Music", directUrl], station, "Music", toast);
      return;
    }

    // Method 4: Fallback to default behavior (will likely download)
    await launchPlayer("open", [mp3Stream.url], station, "", toast);
  } catch (error) {
    toast.hide();
    await showFailureToast(error instanceof Error ? error.message : "Unknown error", {
      title: `Failed to play ${station.title}`,
    });
  }
}
