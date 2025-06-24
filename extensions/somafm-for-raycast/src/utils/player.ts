import { showHUD, closeMainWindow, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { Station } from "../types/station";
import { addToRecentlyPlayed } from "./storage";

const execAsync = promisify(exec);

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

    // Track as recently played
    await addToRecentlyPlayed(station.id);

    // Method 1: Try IINA (popular macOS media player)
    if (await checkPlayerInstalled("iina")) {
      await execAsync(`iina "${mp3Stream.url}"`);
      toast.style = Toast.Style.Success;
      toast.title = `Playing ${station.title}`;
      toast.message = "Opened in IINA";
      await closeMainWindow();
      return;
    }

    // Method 2: Try VLC
    if (await checkPlayerInstalled("vlc")) {
      await execAsync(`vlc "${mp3Stream.url}" --intf dummy --play-and-exit`);
      toast.style = Toast.Style.Success;
      toast.title = `Playing ${station.title}`;
      toast.message = "Opened in VLC";
      await closeMainWindow();
      return;
    }

    // Method 3: Try to get direct stream URL and use Music.app
    const directUrl = await getDirectStreamUrl(mp3Stream.url);
    if (directUrl) {
      // Try opening direct stream URL in Music.app
      await execAsync(`open -a "Music" "${directUrl}"`);
      toast.style = Toast.Style.Success;
      toast.title = `Playing ${station.title}`;
      toast.message = "Opened in Music";
      await closeMainWindow();
      return;
    }

    // Method 4: Fallback to default behavior (will likely download)
    await execAsync(`open "${mp3Stream.url}"`);
    toast.style = Toast.Style.Success;
    toast.title = `Opened ${station.title}`;
    await closeMainWindow();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Failed to play ${station.title}`;
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}
