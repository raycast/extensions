import { showToast, Toast, environment } from "@raycast/api";
import { createClient } from "@supabase/supabase-js";
import { spawn } from "child_process";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import {
  loadPlaybackState,
  clearPlaybackState,
  savePlaybackState,
} from "./shared-state";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./consts";
import { MusicTrack } from "./interfaces";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    // First stop any currently playing music using stored PID or fallback
    const currentState = loadPlaybackState();
    if (currentState && currentState.isPlaying && currentState.pid) {
      try {
        process.kill(currentState.pid, "SIGTERM");
      } catch (error) {
        await showFailureToast(error, {
          title: "Failed to stop previous track using PID",
        });
        spawn("pkill", ["-f", "afplay"]);
      }
    } else {
      spawn("pkill", ["-f", "afplay"]);
    }
    clearPlaybackState();

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "🔀 Reshuffling...",
      message: "Loading new random track",
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get random track from Supabase
    const { data: files, error } = await supabase.storage
      .from("music_tracks")
      .list();

    if (error) throw error;

    if (files && files.length > 0) {
      const musicFiles = files
        .filter((file) => file.name.match(/\.(mp3|wav|m4a|aac|flac)$/i))
        .map((file): MusicTrack => {
          const { data } = supabase.storage
            .from("music_tracks")
            .getPublicUrl(file.name);

          return {
            name: file.name.replace(/\.[^/.]+$/, ""),
            url: data.publicUrl,
            size: file.metadata?.size || 0,
            path: file.name,
          };
        });

      if (musicFiles.length === 0) {
        throw new Error("No music files found");
      }

      // Pick random track
      const randomIndex = Math.floor(Math.random() * musicFiles.length);
      const track = musicFiles[randomIndex];

      toast.title = "🔄 Buffering...";
      toast.message = `Loading ${track.name}`;

      // Download and play the track
      const response = await fetch(track.url);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save to support directory with proper cleanup
      const supportDir = join(environment.supportPath, "audio-cache");
      if (!existsSync(supportDir)) {
        mkdirSync(supportDir, { recursive: true });
      }
      const tempFileName = `looma_reshuffle_${Date.now()}.mp3`;
      const tempFilePath = join(supportDir, tempFileName);
      writeFileSync(tempFilePath, new Uint8Array(buffer));

      // Play the audio file using macOS afplay
      const audioProcess = spawn("afplay", [tempFilePath]);

      // Save current playback state for other commands including PID for targeted killing
      savePlaybackState({
        currentTrack: track,
        isPlaying: true,
        isPaused: false,
        tempFilePath,
        pid: audioProcess.pid,
      });

      audioProcess.on("close", () => {
        // Clean up temp file when done
        if (existsSync(tempFilePath)) {
          try {
            unlinkSync(tempFilePath);
          } catch (e) {
            console.log("Could not delete temp file:", e);
          }
        }
        clearPlaybackState();
      });

      audioProcess.on("error", (err) => {
        console.error("Playback error:", err);
        toast.title = "Playback Error";
        toast.style = Toast.Style.Failure;
        toast.message = `Cannot play ${track.name}`;
        clearPlaybackState();
      });

      toast.title = "♪ Now Playing";
      toast.style = Toast.Style.Success;
      toast.message = track.name;
    } else {
      throw new Error("No tracks found in music library");
    }
  } catch (error) {
    await showFailureToast(error);
  }
}
