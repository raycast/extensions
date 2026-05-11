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
import { MeditationTrack } from "./interfaces";

export default async function Command() {
  try {
    // First stop any currently playing music/meditation using stored PID or fallback
    const existingState = loadPlaybackState();
    if (existingState && existingState.isPlaying && existingState.pid) {
      try {
        process.kill(existingState.pid, "SIGTERM");
      } catch {
        console.error(
          "Failed to stop previous audio using PID, falling back to generic stop.",
        );
        spawn("pkill", ["-f", "afplay"]);
      }
    } else {
      spawn("pkill", ["-f", "afplay"]);
    }
    clearPlaybackState();

    showToast({
      style: Toast.Style.Animated,
      title: "🧘‍♀️ Preparing...",
      message: "Loading meditation session",
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get meditation tracks from separate meditation bucket
    const { data: files, error } = await supabase.storage
      .from("meditation")
      .list();

    if (error) {
      throw new Error(`Cannot access tracks: ${error.message}`);
    }

    if (files && files.length > 0) {
      // Filter for audio files in meditation bucket
      const meditationFiles = files
        .filter((file) => file.name.match(/\.(mp3|wav|m4a|aac|flac)$/i))
        .map((file): MeditationTrack => {
          const { data } = supabase.storage
            .from("meditation")
            .getPublicUrl(file.name);

          return {
            name: file.name.replace(/\.[^/.]+$/, ""),
            url: data.publicUrl,
            size: file.metadata?.size || 0,
            path: file.name,
          };
        });

      if (meditationFiles.length === 0) {
        throw new Error(
          `No meditation files found. Please create a 'meditation' bucket and upload audio files there.`,
        );
      }

      // Pick random meditation track
      const randomIndex = Math.floor(Math.random() * meditationFiles.length);
      const track = meditationFiles[randomIndex];

      showToast({
        style: Toast.Style.Animated,
        title: "🔄 Loading...",
        message: `Preparing "${track.name}"`,
      });

      // Download the meditation track
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
      const tempFileName = `meditation_${Date.now()}.mp3`;
      const tempFilePath = join(supportDir, tempFileName);
      writeFileSync(tempFilePath, new Uint8Array(buffer));

      // Play the meditation session using macOS afplay
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
        // Clean up temp file when meditation session ends
        if (existsSync(tempFilePath)) {
          try {
            unlinkSync(tempFilePath);
          } catch (e) {
            // Ignore cleanup errors
            console.error("Failed to clean up temp file:", e);
          }
        }

        // Clear playback state
        clearPlaybackState();

        if (code === 0) {
          // Meditation session completed successfully
          showToast({
            style: Toast.Style.Success,
            title: "🧘‍♀️ Session Complete",
            message: "Meditation session finished. Take a moment to breathe.",
          });
        }
      });

      audioProcess.on("error", () => {
        clearPlaybackState();
        showToast({
          style: Toast.Style.Failure,
          title: "Playback Error",
          message: `Cannot play meditation: ${track.name}`,
        });
      });

      showToast({
        style: Toast.Style.Success,
        title: "🧘‍♀️ Meditation Started",
        message: `"${track.name}" • Single session`,
      });
    } else {
      throw new Error(
        "Meditation bucket is empty. Please upload meditation audio files to your 'meditation' bucket.",
      );
    }
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Meditation Error",
      message: `Cannot start session: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}
