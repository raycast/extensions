import { showToast, Toast, environment } from "@raycast/api";
import { createClient } from "@supabase/supabase-js";
import { spawn } from "child_process";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import {
  savePlaybackState,
  clearPlaybackState,
  loadPlaybackState,
} from "./shared-state";
import { showFailureToast } from "@raycast/utils";
import { MusicTrack } from "./interfaces";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./consts";

export default async function Command() {
  try {
    // First stop any currently playing music using stored PID or fallback
    const existingState = loadPlaybackState();
    if (existingState && existingState.isPlaying && existingState.pid) {
      try {
        process.kill(existingState.pid, "SIGTERM");
      } catch (error) {
        await showFailureToast(error, {
          title: "Failed to stop previous track using PID",
        });
        spawn("pkill", ["-f", "afplay"]);
      }
    } else {
      spawn("pkill", ["-f", "afplay"]);
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "🎵 Looma.FM",
      message: "Loading music library...",
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get tracks from Supabase (exactly like reshuffle)
    const { data: files, error } = await supabase.storage
      .from("music_tracks")
      .list();

    if (error) throw error;

    if (files && files.length > 0) {
      toast.title = "📁 Found Files";
      toast.message = `Processing ${files.length} files...`;

      const musicFiles = files
        .filter((file) => {
          const isMusic = file.name.match(/\.(mp3|wav|m4a|aac|flac)$/i);
          const hasSize = (file.metadata?.size || 0) > 1000;
          return isMusic && hasSize;
        })
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

      toast.title = "🎵 Music Ready";
      toast.message = `${musicFiles.length} tracks loaded, starting stream...`;

      // Pick random track (exactly like reshuffle)
      const randomIndex = Math.floor(Math.random() * musicFiles.length);
      const track = musicFiles[randomIndex];

      toast.title = "🔄 Buffering...";
      toast.message = `Loading ${track.name}`;

      // Download and play the track (exactly like reshuffle)
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
      const tempFileName = `looma_${Date.now()}.mp3`;
      const tempFilePath = join(supportDir, tempFileName);
      writeFileSync(tempFilePath, new Uint8Array(buffer));

      // Play the audio file using macOS afplay (exactly like reshuffle)
      const audioProcess = spawn("afplay", [tempFilePath]);

      // Save current playback state for other commands including PID for targeted killing
      savePlaybackState({
        currentTrack: track,
        isPlaying: true,
        isPaused: false,
        tempFilePath,
        pid: audioProcess.pid,
      });

      audioProcess.on("close", (code) => {
        // Clean up temp file when done
        if (existsSync(tempFilePath)) {
          try {
            unlinkSync(tempFilePath);
          } catch (e) {
            console.log("Could not delete temp file:", e);
          }
        }

        // Clear playback state
        clearPlaybackState();

        if (code === 0) {
          // Track finished, offer to play another
          toast.title = "🎵 Track Complete";
          toast.message = `"${track.name}" finished • Use Reshuffle for next track`;
          toast.style = Toast.Style.Success;
        }
      });

      audioProcess.on("error", (err) => {
        console.error("Playback error:", err);
        toast.title = "Playback Error";
        toast.message = `Cannot play ${track.name}`;
        toast.style = Toast.Style.Failure;
        clearPlaybackState();
      });

      toast.title = "♪ Now Streaming";
      toast.message = `"${track.name}" • Looma.FM by Adi Goldstein`;
      toast.style = Toast.Style.Success;
    } else {
      throw new Error("No tracks found in music library");
    }
  } catch (error) {
    showFailureToast(error);
  }
}
